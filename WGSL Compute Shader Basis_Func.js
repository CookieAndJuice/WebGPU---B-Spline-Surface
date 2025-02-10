// compute_shader
export function computeShaderSrc(degree, cpsWidth, cpsHeight, uResultLength) {
    return /* wgsl */`
        @group(0) @binding(0)
        var<storage, read> control_points: array<vec2f>;

        @group(0) @binding(1)
        var<storage, read> inputs: array<vec2f>;

        @group(0) @binding(2)
        var<storage, read> intervals: array<vec2u>;

        @group(0) @binding(3)
        var<storage, read_write> output: array<vec2f>;

        @compute @workgroup_size(128)
        fn main(@builtin(global_invocation_id) global_invocation_id: vec3u)
        { 
            let degree = u32(${degree});
            let cpsWidth = u32(${cpsWidth});
            let cpsHeight = u32(${cpsHeight});
            let cpsNum = u32(${cpsWidth});
            var uResult: array<vec2<f32>, ${uResultLength}>;
            let index = global_invocation_id.x;
            
            // de Boor Algorithm
            let tempWidth = degree + 1;
            let uInterval = intervals[index].x;
            let vInterval = intervals[index].y;
            
            // u 방향 계산 (계산 순서 : u 하나에 대해 모든 높이 계산 -> 다음 u 계산)
            let yOffset = cpsWidth;                                     // 높이값 넘어갈 때 offset
            let uInput = inputs[index].x;
        
            var first = (f32(uInterval) + 1 - uInput) * (f32(uInterval) + 1 - uInput) * (f32(uInterval) + 1 - uInput) / 6;
            var second = ((uInput - f32(uInterval) + 2) * (f32(uInterval) + 1 - uInput) * (f32(uInterval) + 1 - uInput) +
                        (f32(uInterval) + 2 - uInput) * (uInput - f32(uInterval) + 1) * (f32(uInterval) + 1 - uInput) +
                        (f32(uInterval) + 2 - uInput) * (f32(uInterval) + 2 - uInput) * (uInput - f32(uInterval))) / 6;
            var third = ((uInput - f32(uInterval) + 1) * (uInput - f32(uInterval) + 1) * (f32(uInterval) + 1 - uInput) +
                        (uInput - f32(uInterval) + 1) * (f32(uInterval) + 2 - uInput) * (uInput - f32(uInterval)) +
                        (f32(uInterval) + 3 - uInput) * (uInput - f32(uInterval)) * (uInput - f32(uInterval))) / 6;
            var fourth = (uInput - f32(uInterval)) * (uInput - f32(uInterval)) * (uInput - f32(uInterval)) / 6;
        
            for (var height = 0u; height < tempWidth; height++)
            {
                let nowPos = (height + vInterval - degree + 1) * yOffset + (uInterval - degree + 1);        // iInitial - 1
                
                var uPoint: vec2<f32>;
            
                uPoint = first * control_points[nowPos] +
                        second * control_points[nowPos + 1] +
                        third * control_points[nowPos + 2] +
                        fourth * control_points[nowPos + 3];
                
                uResult[index * tempWidth + height] = uPoint;
            }
            
            // v 방향 계산
            let xOffset = tempWidth;                    // 너비값 넘어갈 때 offset
            let vInput = inputs[index].y;
            
            let nowPos = index * xOffset;               // iInitial - 1
            
            first = (f32(vInterval) + 1 - vInput) * (f32(vInterval) + 1 - vInput) * (f32(vInterval) + 1 - vInput) / 6;
            second = ((vInput - f32(vInterval) + 2) * (f32(vInterval) + 1 - vInput) * (f32(vInterval) + 1 - vInput) +
                    (f32(vInterval) + 2 - vInput) * (vInput - f32(vInterval) + 1) * (f32(vInterval) + 1 - vInput) +
                    (f32(vInterval) + 2 - vInput) * (f32(vInterval) + 2 - vInput) * (vInput - f32(vInterval))) / 6;
            third = ((vInput - f32(vInterval) + 1) * (vInput - f32(vInterval) + 1) * (f32(vInterval) + 1 - vInput) +
                    (vInput - f32(vInterval) + 1) * (f32(vInterval) + 2 - vInput) * (vInput - f32(vInterval)) +
                    (f32(vInterval) + 3 - vInput) * (vInput - f32(vInterval)) * (vInput - f32(vInterval))) / 6;
            fourth = (vInput - f32(vInterval)) * (vInput - f32(vInterval)) * (vInput - f32(vInterval)) / 6;
            
            var vPoint: vec2<f32>;
            vPoint = first * uResult[nowPos] +
                    second * uResult[nowPos + 1] +
                    third * uResult[nowPos + 2] +
                    fourth * uResult[nowPos + 3];
            
            output[index] = vPoint;
        }
    `;
}