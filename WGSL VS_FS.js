// Vertex Shader & Fragment Shader
export function vertexShaderSrc(aspect, resolution, controlPointsNum)
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
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
            if (${controlPointsNum} <= instanceIndex)
            {
                vsOut.color = vec4f(0, 0, 0, 1);
            }
            else
            {
                vsOut.color = vec4f(0, 0.7, 0.7, 1);
            }
            
            return vsOut;
        }
    `;
}

export function fragmentShaderSrc()
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