// Vertex Shader & Fragment Shader
export function vertexShaderSrc(aspect, clickPoint, mouseDx, mouseDy)
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
        };

        struct Uniforms {
            vertexSize: f32,
            resolution: vec2f,
        }

        struct VSOutput {
            @builtin(position) position: vec4f,
        };

        @group(0) @binding(1) var<uniform> unif: Uniforms;

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
            vert: Vertices
        ) -> VSOutput
        {
            let points = array(
                vec2f(-1, -1),
                vec2f( 1, -1),
                vec2f(-1,  1),
                vec2f(-1,  1),
                vec2f( 1, -1),
                vec2f( 1,  1),
            );

            let centerPoint = vert.position;
            let pos = points[vIndex];
            let aspect = ${aspect}f;

            var vsOut: VSOutput;
            var resolution = vec2f(100, 100);

            if (aspect > 1)
            {
                resolution = vec2f(resolution.x * aspect, resolution.y);
            }
            else
            {
                resolution = vec2f(resolution.x, resolution.y / aspect);
            }

            vsOut.position = vec4f(centerPoint + pos / resolution, 0, 1);
            
            return vsOut;
        }
    `;
}

export function fragmentShaderSrc()
{
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
        }

        @fragment fn fs(fsIn: FSInput) -> @location(0) vec4f
        {
            

            return vec4f(0, 0.7, 0.7, 1);
        }
    `;
}