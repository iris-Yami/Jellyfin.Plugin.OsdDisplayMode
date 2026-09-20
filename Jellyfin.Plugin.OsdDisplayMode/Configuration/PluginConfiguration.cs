using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.OsdDisplayMode.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// hover or click. Used only when the browser has no saved preference.
    /// </summary>
    public string DefaultMode { get; set; } = "hover";
}
