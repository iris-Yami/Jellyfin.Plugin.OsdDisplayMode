using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.OsdDisplayMode.Services;

public class ScriptInjectionStartupFilter : IStartupFilter
{
    public const string StartMarker = "<!-- OSD-DISPLAY-MODE-V3 -->";
    public const string EndMarker = "<!-- /OSD-DISPLAY-MODE-V3 -->";

    private readonly ILogger<ScriptInjectionStartupFilter> _logger;
    private int _loggedOnce;

    public ScriptInjectionStartupFilter(ILogger<ScriptInjectionStartupFilter> logger)
    {
        _logger = logger;
    }

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.Use(InvokeAsync);
            next(app);
        };
    }

    private async Task InvokeAsync(HttpContext context, Func<Task> next)
    {
        if (!IsIndexRequest(context.Request.Path.Value) || !HttpMethods.IsGet(context.Request.Method))
        {
            await next().ConfigureAwait(false);
            return;
        }

        var config = Plugin.Instance?.Configuration;
        if (config is { Enabled: false })
        {
            await next().ConfigureAwait(false);
            return;
        }

        context.Request.Headers.Remove("Accept-Encoding");
        context.Request.Headers.Remove("Range");
        context.Request.Headers.Remove("If-Range");

        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        try
        {
            await next().ConfigureAwait(false);
        }
        catch
        {
            context.Response.Body = originalBody;
            throw;
        }

        context.Response.Body = originalBody;
        buffer.Seek(0, SeekOrigin.Begin);

        var isHtml = context.Response.StatusCode == 200
                     && (context.Response.ContentType?.Contains("text/html", StringComparison.OrdinalIgnoreCase) ?? false);
        if (!isHtml)
        {
            await buffer.CopyToAsync(originalBody).ConfigureAwait(false);
            return;
        }

        string html;
        using (var reader = new StreamReader(buffer, Encoding.UTF8, true, 1024, leaveOpen: true))
        {
            html = await reader.ReadToEndAsync().ConfigureAwait(false);
        }

        try
        {
            if (!html.Contains(StartMarker, StringComparison.OrdinalIgnoreCase))
            {
                var bodyClose = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
                if (bodyClose >= 0)
                {
                    html = html[..bodyClose] + BuildInjectionBlock() + "\n" + html[bodyClose..];
                    if (Interlocked.Exchange(ref _loggedOnce, 1) == 0)
                    {
                        _logger.LogInformation("OSD Display Mode: injected client script into index.html.");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OSD Display Mode: failed to rewrite index.html, serving original page.");
        }

        var bytes = Encoding.UTF8.GetBytes(html);
        context.Response.ContentType = "text/html;charset=utf-8";
        context.Response.ContentLength = bytes.Length;
        context.Response.Headers.Remove("ETag");
        context.Response.Headers.Remove("Last-Modified");
        context.Response.Headers.Remove("Accept-Ranges");
        await originalBody.WriteAsync(bytes).ConfigureAwait(false);
    }

    public static string BuildInjectionBlock()
    {
        var version = Plugin.Instance?.Version.ToString() ?? "1.0.0.0";
        return StartMarker + @"
<script>
(function () {
  if (window.__osdDisplayModeLoaderV3) return;
  window.__osdDisplayModeLoaderV3 = true;
  var path = location.pathname;
  var idx = path.toLowerCase().lastIndexOf('/web');
  var root = idx >= 0 ? path.substring(0, idx) : '';
  var script = document.createElement('script');
  script.src = root + '/OsdDisplayMode/client.v3.js?v=" + version + @"';
  script.defer = true;
  document.head.appendChild(script);
})();
</script>
" + EndMarker;
    }

    private static bool IsIndexRequest(string? path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return false;
        }

        return path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase)
               || path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
               || path.Equals("/web", StringComparison.OrdinalIgnoreCase);
    }
}
