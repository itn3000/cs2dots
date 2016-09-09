namespace Cs2DotsWeb
{
    using System;
    using Microsoft.AspNetCore.Mvc;
    using System.Threading.Tasks;
    using System.Text;
    using System.IO;
    using Microsoft.Extensions.Logging;
    public class Cs2DotsArgument
    {
        public string code { get; set; }
        public string name { get; set; } = "";
        public bool includeToken { get; set; } = false;
        public bool scriptMode { get; set; } = false;
    }
    public class Cs2DotsController : Controller
    {

        Cs2DotsConfig m_Config;
        ILogger<Cs2DotsController> m_Logger;
        public Cs2DotsController(Cs2DotsConfig config, ILogger<Cs2DotsController> logger)
        {
            m_Config = config;
            m_Logger = logger;
        }
        [HttpPost]
        public async Task<IActionResult> ConvertToJson(Cs2DotsArgument arg)
        {
            var executor = new Cs2DotsExecutor(m_Config);
            var jsonString = await executor.ConvertJson(arg.code, arg.name, arg.includeToken, arg.scriptMode).ConfigureAwait(false);
            return Content(jsonString, "application/json", new UTF8Encoding(false));
        }
        [HttpPost]
        public async Task<IActionResult> ConvertToSvg(Cs2DotsArgument arg)
        {
            var executor = new Cs2DotsExecutor(m_Config);
            if (arg == null || arg.code == null)
            {
                m_Logger.LogWarning("argument is null,deserialize from body");
                using (var mstm = new MemoryStream())
                {
                    await Request.Body.CopyToAsync(mstm).ConfigureAwait(false);
                    var bodyString = Encoding.UTF8.GetString(mstm.ToArray());
                    arg = Newtonsoft.Json.JsonConvert.DeserializeObject<Cs2DotsArgument>(bodyString);
                }
            }
            var svgString = await executor.ConvertSvg(arg.code, arg.name, arg.includeToken, arg.scriptMode).ConfigureAwait(false);
            // var svgString = await executor.ConvertSvg(code, name, includeToken, scriptMode).ConfigureAwait(false);
            return Content(svgString, "image/svg+xml", new UTF8Encoding(false));
        }
    }
}