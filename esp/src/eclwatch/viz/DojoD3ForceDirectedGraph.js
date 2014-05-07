define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",

  "./DojoD3",
  "./Mapping",
  
  "d3/d3",

  "dojo/text!./templates/DojoD3ForceDirectedGraph.css"
], function (declare, lang, arrayUtil,
    DojoD3, Mapping,
    d3,
    css) {
    return declare([Mapping, DojoD3], {
        mapping:{
            vertices: {
                display: "Vertices",
                fields: {
                    id: "ID",
                    label: "Label",
                    category: "Category"
                }
            },
            edges: {
                display: "Edges",
                fields: {
                    sourceID: "Source ID",
                    targetID: "Target ID",
                    weight:  "Weight"
                }
            }
        },

        constructor: function (mappings, target) {
            if (mappings)
                this.setFieldMappings(mappings);

            if (target)
                this.renderTo(target);
        },

        resize: function (args) {
            //  No resize needed
        },

        renderTo: function (_target) {
            _target = lang.mixin({
                css: css,
                innerRadiusPct: 0
            }, _target);
            this.inherited(arguments);
        },

        display: function (vertices, edges) {
            if (vertices)
                this.setData(vertices, "vertices");

            if (edges)
                this.setData(edges, "edges");

            var vertices = [];
            idIndex = {};
            arrayUtil.forEach(vertices, function (item, idx) {
                idIndex[item.id] = idx;
            });
            var edges = [];
            arrayUtil.forEach(edges, function (item, idx) {
                item.source = idIndex[item.sourceID];
                item.target = idIndex[item.targetID];
            });

            var color = d3.scale.category20();
            var force = d3.layout.force().charge(-200).linkDistance(120).size([this.target.width, this.target.height]);
            force.nodes(vertices).links(edges);

            var edges = this.SvgG.selectAll(".linkFD").data(edges);
            var link = edges.enter().append("line")
                .style("stroke-width", function (e) { return Math.sqrt(e.weight) })
                .style("stroke", "#999")
                .style("stroke-opacity", ".6")
            ;
            edges.exit().remove();

            var nodes = this.SvgG.selectAll(".nodeFD").data(vertices);
            var gnode = nodes.enter().append("g");
/*            var node = gnode.append("circle")
                .style("fill", function (e) { return color(e.category) })
                .style("stroke", "#fff")
                .style("stroke-width", "1.5px")
                .attr("r", 5)
                .call(force.drag)
            ;
*/
            var node = gnode.append("image")
              .attr("xlink:href", function(d) {
                switch(d.category) {
                  case 0:
                    return "/esp/files/eclwatch/img/file.png"  
                  case 1:
                    return "/esp/files/eclwatch/img/server.png"  
                  case 2:
                    return "/esp/files/eclwatch/img/workunit.png"  
                  case 3:
                    return "/esp/files/eclwatch/img/workunit_deleted.png"  
                  case 4:
                    return "/esp/files/eclwatch/img/autoRefresh.png"  
                  case 5:
                    return "/esp/files/eclwatch/img/locked.png"  
                  case 6:
                    return "/esp/files/eclwatch/img/index.png"  
                  case 7:
                    return "/esp/files/eclwatch/img/folder.png"  
                  case 8:
                    return "/esp/files/eclwatch/img/chart.png"  
                }
              })
              .attr("transform", function(d) { return "translate(-8, -8)"; })
              .attr("width", 16)
              .attr("height", 16)
              .call(force.drag)
            ;
            var label = gnode.append("text")
                .text(function (d) { return d.category + ":" + d.label; })
                .style("text-anchor", "middle")
                .attr({ "dy": 20 })
            ;
            node.append("title").text(function (e) { return e.category + ":" + e.label });
            nodes.exit().remove();
            
            force.on("tick", function () {
                link
                    .attr("x1", function (e) { return e.source.x })
                    .attr("y1", function (e) { return e.source.y })
                    .attr("x2", function (e) { return e.target.x })
                    .attr("y2", function (e) { return e.target.y })
                ;
                gnode
                  .attr("transform", function(d) { return 'translate(' + [d.x, d.y] + ')'; })
                ;                 
            });

            var n = vertices.length;
            var context = this;
            arrayUtil.forEach(vertices, function (e, t) {
                e.x = e.y = context.target.width / n * t
            });

            force.start();
            for (var i = n; i > 0; --i) {
                force.tick()
            }
            force.stop();
        }
    });
});
