// Vertex Shader & Fragment Shader
export function vertexShaderIdSrc(aspect, resolution, controlPointsNum) {
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
        };
    
        struct VSOutput {
            @builtin(position) position: vec4f,
        };
        
        @group(0) @binding(0) var<uniform> uniformId: f32;

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
            @builtin(instance_index) instanceIndex: u32,
            vertex: Vertices
        ) -> VSOutput
        {
            let points = array(
                vec2f(-1, -1),      // left bottom
                vec2f( 1, -1),      // right bottom
                vec2f(-1,  1),      // left top
                vec2f(-1,  1),
                vec2f( 1, -1),
                vec2f( 1,  1),      // right top
            );

            var centerPoint = vertex.position;
            let boxPos = points[vIndex];
            let aspect = ${aspect}f;

            var vsOut: VSOutput;
            var resolution = vec2f(${resolution.x}f, ${resolution.y}f);

            if (aspect > 1)
            {
                resolution = vec2f(resolution.x * aspect, resolution.y);
            }
            else
            {
                resolution = vec2f(resolution.x, resolution.y / aspect);
            }

            vsOut.position = vec4f(centerPoint + boxPos / resolution, 0, 1);
            
            return vsOut;
        }
        
        @fragment fn fs() -> @location(0) vec4f
        {
            return vec4f(vec3(uniformId), 1);
        }
    `;
}