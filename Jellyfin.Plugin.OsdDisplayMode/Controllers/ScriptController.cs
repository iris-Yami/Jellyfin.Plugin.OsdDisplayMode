using System.Reflection;
using System.Text.Json;
using Jellyfin.Plugin.OsdDisplayMode.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.OsdDisplayMode.Controllers;

[ApiController]
[Route("OsdDisplayMode")]
public class ScriptController : ControllerBase
{
    private const string ScriptResource = "Jellyfin.Plugin.OsdDisplayMode.Web.osd-display-mode.js";

    [HttpGet("client.js")]
    [HttpGet("client.v3.js")]
    [AllowAnonymous]
    [Produces("application/javascript")]
    public ActionResult GetClientScript()
    {
        Response.Headers["Cache-Control"] = "no-store";
        var config = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        if (!config.Enabled)
        {
            return Content("/* OSD Display Mode disabled */", "application/javascript");
        }

        var script = ReadEmbeddedScript();
        if (script is null)
        {
            return Content("/* OSD Display Mode script missing */", "application/javascript");
        }

        var defaultMode = string.Equals(config.DefaultMode, "click", StringComparison.OrdinalIgnoreCase)
            ? "click"
            : "hover";
        var prefix = "window.__OSD_DISPLAY_MODE__=" + JsonSerializer.Serialize(new { defaultMode }) + ";\n";
        return Content(prefix + script, "application/javascript");
    }

    private static string? ReadEmbeddedScript()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(ScriptResource);
        if (stream is null)
        {
            return null;
        }

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
