// compute_shader
export function computeShaderSrc(degree, cpsWidth, cpsHeight, tempWidth)
{
    return /* wgsl */`
        @group(0) @binding(0)
        var<storage, read> control_points: array<vec2f>;

        @group(0) @binding(1)
        var<storage, read> knots: array<u32>;

        @group(0) @binding(2)
        var<storage, read> inputs: array<vec2f>;

        @group(0) @binding(3)
        var<storage, read> intervals: array<vec2u>;

        @group(0) @binding(4)
        var<storage, read_write> output: array<vec2f>;

        @compute @workgroup_size(64)
        fn main(
            @builtin(workgroup_id) workgroup_id : vec3<u32>,
            @builtin(local_invocation_index) local_invocation_index: u32,
            @builtin(num_workgroups) num_workgroups: vec3<u32>)
        {
            let workgroup_index =
                workgroup_id.x +
                workgroup_id.y * num_workgroups.x +
                workgroup_id.z * num_workgroups.x * num_workgroups.y;
                
            let global_invocation_index =
                workgroup_index * 64 +
                local_invocation_index;
            
            let degree = u32(${degree});
            let cpsWidth = u32(${cpsWidth});
            let cpsHeight = u32(${cpsHeight});
            let cpsNum = u32(${cpsWidth});
            let tempWidth = u32(${tempWidth});
            var uResult: array<vec2<f32>, ${tempWidth}>;
            let index = global_invocation_index;
            
            // de Boor Algorithm
            let uInterval = intervals[index].x;
            let vInterval = intervals[index].y;
            
            // u 방향 계산 (계산 순서 : u 하나에 대해 모든 높이 계산 -> 다음 u 계산)
            let yOffset = cpsWidth;                                     // 높이값 넘어갈 때 offset
            
            for (var height = 0u; height < tempWidth; height++)
            {
                let nowPos = (height + vInterval - degree + 1) * yOffset + (uInterval - degree + 1);        // iInitial - 1
                var tempCps: array<vec2<f32>, ${tempWidth}>;                          // 계산값 임시 저장 리스트
                for(var num = 0u; num < tempWidth; num++)
                {
                    tempCps[num] = control_points[nowPos + num];
                }
                
                for (var k = 1u; k < degree + 1; k++)
                {
                    let iInitial = uInterval - degree + k + 1;
                    var uIntervalIndex = degree;
                    
                    for (var i = uInterval + 1u; i > iInitial - 1u; i--)
                    {
                        let alpha = (inputs[index].x - f32(knots[i - 1])) / f32(knots[i + degree - k] - knots[i - 1]);
                        tempCps[uIntervalIndex] = (1 - alpha) * tempCps[uIntervalIndex - 1] + alpha * tempCps[uIntervalIndex];
                        uIntervalIndex--;
                    }
                }
                uResult[height] = tempCps[degree];
            }
            
            // v 방향 계산
            for (var k = 1u; k < degree + 1; k++)
            {
                let iInitial = vInterval - degree + k + 1;
                var vIntervalIndex = degree;
                
                for (var i = vInterval + 1u; i > iInitial - 1u; i--)
                {
                    let alpha = (inputs[index].y - f32(knots[i - 1])) / f32(knots[i + degree - k] - knots[i - 1]);
                    uResult[vIntervalIndex] = (1 - alpha) * uResult[vIntervalIndex - 1] + alpha * uResult[vIntervalIndex];
                    vIntervalIndex--;
                }
            }
            output[index] = uResult[degree];
        }
    `;
}