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
        };

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
            
            var centerPoint = vertex.position;
            let boxPos = points[vIndex];

            var vsOut: VSOutput;
            var sizeRatio = vec3f(${sizeRatio.x}f, ${sizeRatio.y}f, ${sizeRatio.z}f);
            
            vsOut.position = vec4f(centerPoint + boxPos / sizeRatio, 1);
            
            vsOut.color = vec4f(1, 164 / 255.0, 179 / 255.0, 1);
            
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