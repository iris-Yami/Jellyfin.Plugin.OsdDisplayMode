using System.Globalization;
using Jellyfin.Plugin.OsdDisplayMode.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.OsdDisplayMode;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public const string PluginGuid = "a7c3e9d1-4b2f-4e8a-9c1d-6f5a2b8e3d70";

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "OSD Display Mode";

    public override string Description =>
        "Adds a player-settings switch for OSD display mode (hover / click) without breaking the Jellyfin 12 back button.";

    public override Guid Id => Guid.Parse(PluginGuid);

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                DisplayName = "菜单显示方式",
                EnableInMainMenu = false,
                EmbeddedResourcePath = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}.Configuration.configPage.html",
                    GetType().Namespace)
            }
        ];
    }
}
