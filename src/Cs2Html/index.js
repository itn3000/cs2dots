var Vue = require("vue");
var hljs = require('highlight.js');
var indexcss = require('!style!css!./index.css');
var highlightcss = require('!style!css!highlight.js/styles/github.css');
// var data = JSON.parse(fs.readFileSync('nodeTree.json', {encoding: 'utf8'}));
var data = require('./nodeTree.js');

// hljs.initHighlightingOnLoad();
// hljs.configure({
//     useBR:true,
//     tabReplace:"    "
// });
Vue.directive('highlightjs',function(){
    hljs.highlightBlock(this.el)
});
Vue.filter('highlight',function(value){

});

Vue.component('item', {
    template: "#tree-template",
    props: {
        model: Object
    },
    data: function () {
        return {
            open: true
        }
    },
    computed: {
        hasChildren: function () {
            return this.model.Children.length != 0;
        },
        codeContents: function() {
            return '<code class="csharp">' + this.model.Contents + '</code>'; 
        }
    },
    methods: {
        toggle: function () {
            if (this.hasChildren) {
                this.open = !this.open;
            }
        },
        highlight:function(value){
            var parser = new DOMParser();
            console.log(value);
            var dom = parser.parseFromString(value,"text/html");
            console.log("before");
            console.log(dom.body.innerHTML);
            hljs.highlightBlock(dom.body.firstChild);
            console.log("after");
            console.log(dom.body.firstChild.innerHTML);
            return '<pre>' + dom.body.firstChild.innerHTML + '</pre>';
            // return dom.body.firstChild.innerHTML;
        }
    },
    filters: {
    }
});
var tree = new Vue({
    el: "#vueapp",
    data:{
        treeData: data
    }
});
