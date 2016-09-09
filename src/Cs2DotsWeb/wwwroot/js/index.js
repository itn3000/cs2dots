require.config(
    {
        paths:
        {
            'vs': '/jslib/monaco-editor/min/vs',
            'vue': '/jslib/vue/dist',
            'axios': '/jslib/axios/dist'
        }
    });
require(['vs/editor/editor.main', 'vue/vue', 'axios/axios'], function (M, Vue, axios) {
    console.log("initializing");
    console.log(axios);
    console.log(basePath);
    var elem = document.getElementById("monacocontainer");
    editor = monaco.editor.create(elem, {
        value: [
            "using System;",
            "namespace Test{",
            "    public class Abc",
            "    {",
            "    }",
            "}"
        ].join('\n'),
        language: "csharp"
    });
    var app = new Vue({
        el: "#vueapp",
        data: {
            codeContent: "",
            svgData: "<svg></svg>",
            includeToken: false,
            scriptMode: false
        },
        methods: {
            convertSvg: function (ev) {
                console.log("begin svg request");
                console.log(editor.getValue());
                var v = this;
                axios.create(
                        {
                            headers:{
                                "Content-Type":"application/json"
                            },
                            proxy: null
                        }
                    )
                    .post('/Cs2Dots/ConvertToSvg', {
                        code: editor.getValue(),
                        scriptMode: v.scriptMode,
                        includeToken: v.includeToken
                    })
                    .then(function (res) {
                        console.log("post success")
                        v.svgData = res.data;
                    })
                    .catch(function (er) {
                        console.log("post failed");
                        console.log(er);
                    })
                    ;
            }
        }
    });
    return app;
});
