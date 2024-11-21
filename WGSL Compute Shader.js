// compute_shader
export function computeShaderSrc(degree, cpsWidth, cpsHeight, uResultLength, tempWidth)
{
    return /* wgsl */`
        struct InputData
        {
            uInputs: array<f32>;
            vInputs: array<f32>;
            control_points: array<vec2<f32>>;
            knots: array<u32>;
            uIntervals: array<u32>;
            vIntervals: array<u32>;
        }

        @group(0) @binding(0)
        var<storage, read> inDatas: InputData;

        @group(0) @binding(1)
        var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(32)
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
            let uInterval = inDatas.uIntervals[index];
            let vInterval = inDatas.vIntervals[index];
            
            // u 방향 계산 (계산 순서 : u 하나에 대해 모든 높이 계산 -> 다음 u 계산)
            let yOffset = cpsWidth;                                     // 높이값 넘어갈 때 offset
            
            for (var height = 0u; height < ${tempWidth}; height++)
            {
                let nowPos = (height + vInterval - degree + 1) * yOffset + (uInterval - degree + 1);        // iInitial - 1
                var tempCps: array<vec2<f32>, ${tempWidth}>;                          // 계산값 임시 저장 리스트
                for(var num = 0u; num < ${tempWidth}; num++)
                {
                    tempCps[num] = inDatas.control_points[nowPos + num];
                }
                
                for (var k = 1u; k < degree + 1; k++)
                {
                    let iInitial = uInterval - degree + k + 1;
                    var uIntervalIndex = degree;
                    
                    for (var i = uInterval + 1u; i > iInitial - 1u; i--)
                    {
                        let alpha = (inDatas.uInputs[index] - f32(inDatas.knots[i - 1])) / f32(inDatas.knots[i + degree - k] - inDatas.knots[i - 1]);
                        tempCps[uIntervalIndex] = (1 - alpha) * tempCps[uIntervalIndex - 1] + alpha * tempCps[uIntervalIndex];
                        uIntervalIndex--;
                    }
                }
                uResult[index * tempWidth + height] = tempCps[degree];
            }
            
            // v 방향 계산
            let xOffset = tempWidth;                    // 너비값 넘어갈 때 offset
            
            let nowPos = index * xOffset;               // 계산값 임시 저장 리스트
            var vTempCps: array<vec2<f32>, ${tempWidth}>;
            for(var num = 0u; num < ${tempWidth}; num++)
            {
                vTempCps[num] = uResult[nowPos + num];
            }
            
            for (var k = 1u; k < degree + 1; k++)
            {
                let iInitial = vInterval - degree + k + 1;
                var vIntervalIndex = degree;
                
                for (var i = vInterval + 1u; i > iInitial - 1u; i--)
                {
                    let alpha = (inDatas.vInputs[index] - f32(inDatas.knots[i - 1])) / f32(inDatas.knots[i + degree - k] - inDatas.knots[i - 1]);
                    vTempCps[vIntervalIndex] = (1 - alpha) * vTempCps[vIntervalIndex - 1] + alpha * vTempCps[vIntervalIndex];
                    vIntervalIndex--;
                }
            }
            output[index] = vTempCps[degree].x;
            output[index + 31] = vTempCps[degree].y;
        }
    `;
}