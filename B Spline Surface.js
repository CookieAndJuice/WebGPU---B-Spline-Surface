import { vertexShaderSrc } from './WGSL VS_FS.js';
import { fragmentShaderSrc } from './WGSL VS_FS.js';
import { computeShaderSrc } from './WGSL Compute Shader.js';

function findInterval(knotList, point) {
    let returnIndex = 0;
    let floorPoint = Math.floor(point);

    for (let i = 0; i < knotList.length; ++i) {
        if (floorPoint == knotList[i])
            returnIndex = i;
    }

    return returnIndex;
}

async function main() {  
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device)
    {
        fail('need a browser that supports Webgpu');
        return;
    }

    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });
    
    // Screen Setting
    const screenWidth = 2560;
    const screenHeight = 1440;
    const aspect = screenWidth / screenHeight;

    // Basic Setting
    const maxRange = 0.75;
    
    const maxWidth = maxRange;
    const maxHeight = maxRange;
    if (aspect > 1)
        maxWidth = maxRange / aspect;
    else
        maxHeight = maxRange * aspect;
    
    // control points
    const cpsWidth = 10;
    const cpsHeight = 10;
    const offsetX = maxWidth / (cpsWidth - 1);
    const offsetY = maxHeight / (cpsHeight - 1);

    // TypedArrays
    // control points
    const controlPointUnitSize = 2 * 4;         // vec2<f32>
    const controlPointsSize = controlPointUnitSize * cpsHeight * cpsWidth;
    const cpsTypedArray = new Int32Array(controlPointsSize);
    for (let v = 0; v < cpsHeight; ++v) {
        for (let u = 0; u < cpsWidth; ++u) {
            const cpsOffset = (v * cpsWidth + u) * (controlPointUnitSize / 4);

            cpsTypedArray.set([-maxWidth + offsetX * u, -maxHeight + offsetY * v], cpsOffset);
        }
    }

    // degree
    const degree = 3;

    // knots
    const knotNumbers = cpsWidth + degree - 1;
    const knotArray = [];
    for (let i = 0; i < knotNumbers; ++i) {
        knotArray[i] = i;
    }
    const knotTypedArray = new Uint32Array(knotArray);

    // calculate domain knots
    const start = degree - 1;                       // domain start point
    const end = knotTypedArray.length - degree;     // domain end point
    const domainNum = end - start + 1;              // domain knots number

    // draw points
    const dTheta = 12;
    const drawPointsNum = 360 / dTheta;
    const drawPointsUnitSize = 2 * 4;           // vec2<f32>
    const drawPointsSize = drawPointsUnitSize * drawPointsNum;

    let theta = 0;
    let radius = 4;
    const drawPointsArray = [];
    for (let i = 0; i < drawPointsNum; ++i) {
        theta = i * dTheta;

        drawPointsArray[i] = [Number(radius * Math.cos(theta * Math.PI / 180)) * (domainNum - 1) + start,
                              Number(radius * Math.sin(theta * Math.PI / 180)) * (domainNum - 1) + start];
    }
    const drawPointsTypedArray = new Float32Array(drawPointsArray);

    // intervals
    const intervalArray = [];
    let uInterval = 0;
    let vInterval = 0;
    for (let i = 0; i < drawPointsNum; ++i) {
        if (drawPointsArray[i][0] == knotArray[end])
            uInterval = end - 1;
        else
            uInterval = findInterval(knotArray, drawPointsArray[i][0]);

        if (drawPointsArray[i][1] == knotArray[end])
            vInterval = end - 1;
        else
            vInterval = findInterval(knotArray, drawPointsArray[i][1]);
        intervalArray[i] = [uInterval, vInterval];
    }
    const intervalTypedArray = new Uint32Array(intervalArray);

    // uResult & tempCps size
    const uResultLength = drawPointsArray.length * cpsHeight;
    const output_U_V_Offset = drawPointsArray.length;
    const tempWidth = degree + 1;    
    
    // Shader
    const vertexShaderModule = device.createShaderModule({
        label: 'B Spline Surface Vertex Module',
        code: vertexShaderSrc(),
    });

    const fragmentShaderModule = device.createShaderModule({
        label: 'B Spline Surface Fragment Module',
        code: fragmentShaderSrc(),
    });

    const computeShaderModule = device.createShaderModule({
        label: 'B Spline Surface Compute Module',
        code: computeShaderSrc(degree, cpsWidth, cpsHeight, uResultLength, tempWidth),
    });

    // Pipeline
    // 튜토리얼에서는 파이프라인에 compute: { module, } 프로퍼티를 넣었는데, 여기의 module이 변수명이 아니라 프로퍼티 명이었다... 어쩐지 module 대신 computeShaderModule을 넣으면 오류나더라....
    const renderPipeline = device.createRenderPipeline({
        label: 'B Spline Surface Render Pipeline',
        layout: 'auto',
        vertex: {
            module: vertexShaderModule,
            buffers: [
                {
                    arrayStride: (2 + 1) * 4,
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ]
                }
            ]
        },
        fragment: {
            module: fragmentShaderModule,
            target: [{ format: presentationFormat }],
        },
    });

    const computePipeline = device.createComputePipeline({
        label: 'B Spline Surface Compute Pipeline',
        layout: 'auto',
        compute: {
            module: computeShaderModule,
        },
    });

    // RenderPassDescriptor
    const renderPassDescriptor = {
        label: 'canvas renderpass',
        colorAttachments: [
            {
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    };

    // VS Uniform Buffers
    const uniformTypedArray = new Float32Array(3);
    const resolutionOffset = 0;
    const resolutionValue = uniformTypedArray.subarray(resolutionOffset, resolutionOffset + 3);
    
    const uniformBuffer = device.createBuffer({
        label: 'uniform buffer',
        size: uniformTypedArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    
    
    // CS Storage Buffers
    // writeBuffer를 통해 데이터를 넣는 행위에도 usage: COPY_DST가 필요하다.
    const controlPointsBuffer = device.createBuffer({
        label: 'control_points buffer',
        size: controlPointsSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(controlPointsBuffer, 0, cpsTypedArray);

    const knotsBuffer = device.createBuffer({
        label: 'knots buffer',
        size: knotNumbers * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(knotsBuffer, 0, knotTypedArray);
    
    const inputBuffer = device.createBuffer({
        label: 'compute shader input data buffer',
        size: drawPointsNum * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inputBuffer, 0, drawPointsTypedArray);

    const intervalBuffer = device.createBuffer({
        label: 'uIntervals buffer',
        size: drawPointsNum * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(intervalBuffer, 0, intervalTypedArray);

    const outputBuffer = device.createBuffer({
        label: 'output buffer',
        size: drawPointsNum * 4 * 2,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    const computeBindGroup = device.createBindGroup({
        label: 'bindGroup for compute shader',
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: controlPointsBuffer } },
            { binding: 1, resource: { buffer: knotsBuffer } },
            { binding: 2, resource: { buffer: inputBuffer } },
            { binding: 3, resource: { buffer: intervalBuffer } },
            { binding: 4, resource: { buffer: outputBuffer } },
        ]
    });

    function render() {
        const encoder = device.createCommandEncoder({ label: "compute encoder" });
        const computePass = encoder.beginComputePass({ label: "compute pass" } );

        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const renderPass = encoder.beginRenderPass(renderPassDescriptor);

        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(1);
        computePass.end();

        renderPass.setPipeline(renderPipeline);
        renderPass.draw(6);
        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    render();
}
main();