pc.extend(pc.fw, function () {
/**
     * @name pc.fw.DirectionalLightComponentSystem
     * @constructor Create a new DirectionalLightComponentSystem
     * @class A Light Component is used to dynamically light the scene.
     * @param {Object} context
     * @extends pc.fw.ComponentSystem
     */
    var DirectionalLightComponentSystem = function (context) {
        this.id = 'directionallight'
        context.systems.add(this.id, this);

        this.ComponentType = pc.fw.DirectionalLightComponent;
        this.DataType = pc.fw.DirectionalLightComponentData;

        this.schema = [{
            name: "enable",
            displayName: "Enable",
            description: "Enable or disable the light",
            type: "boolean",
            defaultValue: true
        }, {
            name: "color",
            displayName: "Color",
            description: "Light color",
            type: "rgb",
            defaultValue: "0xffffff"

        }, {
            name: "intensity",
            displayName: "Intensity",
            description: "Factors the light color",
            type: "number",
            defaultValue: 1,
            options: {
                min: 0,
                max: 10,
                step: 0.05
            }

        }, {
            name: "castShadows",
            displayName: "Cast shadows",
            description: "Cast shadows from this light",
            type: "boolean",
            defaultValue: false
        }, {
            name: 'light',
            exposed: false
        }];
        
        this.exposeProperties();

        this.renderable = _createGfxResources();

        this.bind('remove', this.onRemove.bind(this));
        pc.fw.ComponentSystem.bind('toolsUpdate', this.toolsUpdate.bind(this));
    };
        
    DirectionalLightComponentSystem = pc.inherits(DirectionalLightComponentSystem, pc.fw.ComponentSystem);

    pc.extend(DirectionalLightComponentSystem.prototype, {
        initializeComponentData: function (component, data, properties) {
            var light = new pc.scene.LightNode();
            light.setType(pc.scene.LightType.DIRECTIONAL);

            data = data || {};
            data.light = light;

            properties = ['light', 'enable', 'color', 'intensity', 'castShadows'];
            DirectionalLightComponentSystem._super.initializeComponentData.call(this, component, data, properties);
        },

        onRemove: function (entity, data) {
            entity.removeChild(data.light);

            data.light.setEnabled(false);
            data.light = null;
        },

        toolsUpdate: function (fn) {
            var id;
            var entity;
            var components = this.store;

            for (id in components) {
                if (components.hasOwnProperty(id)) {
                    entity = components[id].entity;
            
                    this.context.scene.enqueue('opaque', function (renderable, transform) {
                        return function () {
                            // Render a representation of the light
                            var device = pc.gfx.Device.getCurrent();
                            device.setProgram(renderable.program);
                            device.setVertexBuffer(renderable.vertexBuffer, 0);
                            
                            device.scope.resolve("matrix_model").setValue(transform);
                            device.scope.resolve("uColor").setValue([1, 1, 0, 1]);
                            device.draw({
                                type: pc.gfx.PrimType.LINES,
                                base: 0,
                                count: renderable.vertexBuffer.getNumVertices(),
                                indexed: false
                            });

                        } 
                    }(this.renderable, entity.getWorldTransform()));
                }
            }
        },

        
    });

    var _createGfxResources = function () {
        // Create the graphical resources required to render a light
        var device = pc.gfx.Device.getCurrent();
        var library = device.getProgramLibrary();
        var program = library.getProgram("basic", { vertexColors: false, diffuseMap: false });
        var format = new pc.gfx.VertexFormat();
        format.begin();
        format.addElement(new pc.gfx.VertexElement("vertex_position", 3, pc.gfx.VertexElementType.FLOAT32));
        format.end();
        var vertexBuffer = new pc.gfx.VertexBuffer(format, 32, pc.gfx.VertexBufferUsage.STATIC);
        // Generate the directional light arrow vertex data
        vertexData = [ 
            // Center arrow
            0, 0, 0, 0, -8, 0,       // Stalk
            -0.5, -8, 0, 0.5, -8, 0, // Arrowhead base
            0.5, -8, 0, 0, -10, 0,   // Arrowhead tip
            0, -10, 0, -0.5, -8, 0,  // Arrowhead tip
            // Lower arrow
            0, 0, -2, 0, -8, -2,         // Stalk
            -0.25, -8, -2, 0.25, -8, -2, // Arrowhead base
            0.25, -8, -2, 0, -10, -2,    // Arrowhead tip
            0, -10, -2, -0.25, -8, -2    // Arrowhead tip
        ];
        var rot = pc.math.mat4.makeRotate(120, [0, 1, 0]);
        for (var i = 0; i < 16; i++) {
            var pos = pc.math.vec3.create(vertexData[(i+8)*3], vertexData[(i+8)*3+1], vertexData[(i+8)*3+2]);
            var posRot = pc.math.mat4.multiplyVec3(pos, 1.0, rot);
            vertexData[(i+16)*3]   = posRot[0];
            vertexData[(i+16)*3+1] = posRot[1];
            vertexData[(i+16)*3+2] = posRot[2];
        }
        // Copy vertex data into the vertex buffer
        var positions = new Float32Array(vertexBuffer.lock());
        for (var i = 0; i < vertexData.length; i++) {
            positions[i] = vertexData[i];
        }
        vertexBuffer.unlock();

        // Set the resources on the component
        return {
            program: program,
            vertexBuffer: vertexBuffer
        };
    };

    return {
        DirectionalLightComponentSystem: DirectionalLightComponentSystem
    };
}());