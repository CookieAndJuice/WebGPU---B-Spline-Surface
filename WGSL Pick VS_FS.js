// Vertex Shader & Fragment Shader
export function ShaderIdSrc(aspect, resolution) {
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
            @location(1) id: f32,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @group(0) @binding(0) var<uniform> uniformMVP: mat3x3f;

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

            var tempPosition = uniformMVP * vec3f(centerPoint, 1);
            centerPoint = tempPosition.xy;
            
            vsOut.position = vec4f(centerPoint + boxPos / resolution, 0, 1);
            vsOut.color = vec4f(vec3(vertex.id), 1);
            
            return vsOut;
        }
        
        @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f
        {
            return fsInput.color;
        }
    `;
}