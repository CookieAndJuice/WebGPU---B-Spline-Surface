// Vertex Shader & Fragment Shader
export function controlPointsVertexShaderSrc(sizeRatio)
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec3f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
            @location(1) lightDir: vec3f,
            @location(2) normal: vec3f,
            @location(3) viewDir: vec3f,
        };

        struct Uniforms {
            MVP: mat4x4f,
            lightDir: vec3f,
            eyePos: vec3f,
        };

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
            @builtin(instance_index) instanceIndex: u32,
            vertex: Vertices
        ) -> VSOutput
        {
            let points = array(
                vec3f(-1,  1, -1),
                vec3f( 1, -1, -1),
                vec3f( 1, -1, -1),
                vec3f( 1,  1, -1),
                vec3f(-1,  1,  1),
                vec3f(-1, -1,  1),
                vec3f( 1, -1,  1),
                vec3f( 1,  1,  1),
            );

            // let normals = array(
            //     vec3f(-1,  1, -1),
            //     vec3f( 1, -1, -1),
            //     vec3f( 1, -1, -1),
            //     vec3f( 1,  1, -1),
            //     vec3f(-1,  1,  1),
            //     vec3f(-1, -1,  1),
            //     vec3f( 1, -1,  1),
            //     vec3f( 1,  1,  1),
            // )
            
            var centerPoint = vertex.position;
            let boxPos = points[vIndex];

            var vsOut: VSOutput;
            var sizeRatio = vec3f(${sizeRatio.x}f, ${sizeRatio.y}f, ${sizeRatio.z}f);
            
            vsOut.position = uniforms.MVP * vec4f(centerPoint + boxPos / sizeRatio, 1);
            vsOut.color = vec4f(1, 14 / 255.0, 100 / 255.0, 1);
            // vsOut.lightDir = normalize(-uniforms.lightDir);
            // vsOut.normal = normalize(vertex.normal);
            // vsOut.viewDir = normalize(uniforms.eyePos - position);
            
            return vsOut;
        }
    `;
}

export function controlPointsFragmentShaderSrc()
{
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @fragment fn fs(fsIn: FSInput) -> @location(0) vec4f
        {
            return fsIn.color;
        }
    `;
}