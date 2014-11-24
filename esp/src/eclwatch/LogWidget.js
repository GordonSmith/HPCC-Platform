/*##############################################################################
#    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems.
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.
############################################################################## */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",
    "dojo/dom",
    "dojo/request/xhr",

    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/registry",

    "hpcc/_Widget",
    "hpcc/ESPWorkunit",

    "dojo/text!../templates/LogWidget.html",

    "dijit/Toolbar",
    "dijit/ToolbarSeparator",
    "dijit/form/Button"

], function (declare, lang, i18n, nlsHPCC, dom, xhr,
            BorderContainer, ContentPane, registry,
            _Widget, ESPWorkunit,
            template) {
        return declare("LogWidget", [_Widget], {
            templateString: template,
            baseClass: "ECLSourceWidget",
            i18n: nlsHPCC,

            borderContainer: null,
            eclSourceContentPane: null,
            wu: null,
            editor: null,
            markers: [],
            highlightLines: [],
            readOnly: false,

            postCreate: function (args) {
                this.inherited(arguments);
                this.borderContainer = registry.byId(this.id + "BorderContainer");
            },

            resize: function (args) {
                this.inherited(arguments);
                this.borderContainer.resize();
            },

            _onRefresh: function (event) {
            },

            //  Plugin wrapper  ---
            init: function (params) {
                if (this.inherited(arguments))
                    return;

                this.editor = CodeMirror.fromTextArea(document.getElementById(this.id + "EclCode"), {
                    tabMode: "indent",
                    matchBrackets: false,
                    gutter: true,
                    lineNumbers: true,
                    mode: "ecl",
                    readOnly: true
                });
                dom.byId(this.id + "EclContent").style.backgroundColor = this.readOnly ? 0xd0d0d0 : 0xffffff;
                this.setText("");
            },

            setCursor: function (line, col) {
                this.editor.setCursor(line - 1, col - 1);
                this.editor.focus();
            },

            clearHighlightLines: function () {
                for (var i = 0; i < this.highlightLines.length; ++i) {
                    this.editor.setLineClass(this.highlightLines[i], null, null);
                }
            },

            highlightLine: function (line) {
                this.highlightLines.push(this.editor.setLineClass(line - 1, "highlightline"));
            },

            setText: function (text) {
                try {
                    this.editor.setValue(text);
                } catch (e) {
                    topic.publish("hpcc/brToaster", {
                        Severity: "Error",
                        Source: "ECLSourceWidget.setText",
                        Exceptions: [
                            { Message: this.i18n.SetTextError },
                            { Message: e.toString ? (this.i18n.Details + ":\n" + e.toString()) : e }
                        ]
                    });
                }
            },

            setReadOnly: function (readonly) {
                this.editor.readOnly(readonly);
            },

            getText: function () {
                return this.editor.getValue();
            }
        });
    });
