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
    const screenWidth = canvas.width;
    const screenHeight = canvas.height;
    const aspect = screenWidth / screenHeight;

    // Basic Setting
    const maxRange = 0.75;
    
    let maxWidth = maxRange;
    let maxHeight = maxRange;
    if (aspect > 1)
        maxWidth = maxRange / aspect;
    else
        maxHeight = maxRange * aspect;
    
    // control points
    const vertexSize = 16;
    const cpsWidth = 10;
    const cpsHeight = 10;
    const offsetX = maxWidth * 2 / (cpsWidth - 1);
    const offsetY = maxHeight * 2 / (cpsHeight - 1);
    
    // TypedArrays
    // control points
    const controlPointUnitSize = 2 * 4;         // vec2<f32>
    const controlPointsSize = controlPointUnitSize * cpsHeight * cpsWidth;
    const cpsTypedArray = new Float32Array(controlPointsSize / 4);
    
    let cpsOffset = 0;
    for (let v = 0; v < cpsHeight; ++v) {
        for (let u = 0; u < cpsWidth; ++u) {
            
            cpsTypedArray.set([-maxWidth + offsetX * u, -maxHeight + offsetY * v], cpsOffset);
            cpsOffset += 2;
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
    const end = knotArray.length - degree;          // domain end point
    const domainNum = end - start + 1;              // domain knots number

    // draw points
    const dTheta = 12;
    const drawPointsNum = 360 / dTheta;
    const drawPointsUnitSize = 2 * 4;           // vec2<f32>
    const drawPointsSize = drawPointsUnitSize * drawPointsNum;

    const radius = 4;
    let theta = 0;
    let dpsOffset = 0;
    const drawPointsArray = [];
    for (let i = 0; i < drawPointsNum; ++i) {
        theta = i * dTheta;

        drawPointsArray[i] = [Number((5 + radius * Math.cos(theta * Math.PI / 180)) / 10) * (domainNum - 1) + start,
                              Number((5 + radius * Math.sin(theta * Math.PI / 180)) / 10) * (domainNum - 1) + start];
        dpsOffset += 2;
    }
    const drawPointsTypedArray = new Float32Array(drawPointsArray.flat());

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
    const intervalTypedArray = new Uint32Array(intervalArray.flat());  

    // uResult & tempCps size
    const uResultLength = drawPointsArray.length * cpsHeight;
    const output_U_V_Offset = drawPointsArray.length;
    const tempWidth = degree + 1;    
    
    // Shader
    const vertexShaderModule = device.createShaderModule({
        label: 'B Spline Surface Vertex Module',
        code: vertexShaderSrc(aspect),
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
                    arrayStride: 2 * 4, // 2 floats, 4 bytes each
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },
                    ],
                },
            ],
        },
        fragment: {
            module: fragmentShaderModule,
            targets: [{ format: presentationFormat }],
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
        size: drawPointsSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inputBuffer, 0, drawPointsTypedArray);

    const intervalBuffer = device.createBuffer({
        label: 'uIntervals buffer',
        size: drawPointsNum * 2 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(intervalBuffer, 0, intervalTypedArray);

    const outputBuffer = device.createBuffer({
        label: 'output buffer',
        size: drawPointsNum * 4 * 2,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    const computeResultBuffer = device.createBuffer({
        label: 'computeResult buffer',
        size: drawPointsNum * 4 * 2,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
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

    // VS vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer',
        size: controlPointsSize + drawPointsNum * 4 * 2,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Render
    async function render() {
        const encoder = device.createCommandEncoder({ label: "encoder" });
        
        {
            const computePass = encoder.beginComputePass({ label: "compute pass" });

            computePass.setPipeline(computePipeline);
            computePass.setBindGroup(0, computeBindGroup);
            computePass.dispatchWorkgroups(1);
            computePass.end();
        }
        
        // copy compute shader results to map
        encoder.copyBufferToBuffer(outputBuffer, 0, computeResultBuffer, 0, computeResultBuffer.size);
        
        // copy compute shader results to vertex buffer
        encoder.copyBufferToBuffer(controlPointsBuffer, 0, vertexBuffer, 0, controlPointsSize);
        encoder.copyBufferToBuffer(outputBuffer, 0, vertexBuffer, controlPointsSize, drawPointsNum * 4 * 2);
        
        {
            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
            const renderPass = encoder.beginRenderPass(renderPassDescriptor);

            renderPass.setPipeline(renderPipeline);
            renderPass.setVertexBuffer(0, vertexBuffer);
            renderPass.draw(6, cpsWidth * cpsHeight + drawPointsNum);
            renderPass.end();
        }
        
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        
        // check compute shader output
        await computeResultBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(computeResultBuffer.getMappedRange());

        console.log('compute shader control points', cpsTypedArray);
        console.log('compute shader knot points', knotTypedArray);
        console.log('compute shader draw points', drawPointsTypedArray);
        console.log('compute shader interaval points', intervalTypedArray);
        console.log('compute shader result', result);

        computeResultBuffer.unmap();
    }
    
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
            // re-render
            render();
        }
    });
    observer.observe(canvas);
}
main();