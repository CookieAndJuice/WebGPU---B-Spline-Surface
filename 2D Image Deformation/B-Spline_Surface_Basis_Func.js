import { vertexShaderSrc } from './WGSL_VS_FS.js';
import { fragmentShaderSrc } from './WGSL_VS_FS.js';
import { computeShaderSrc } from './WGSL_Compute_Shader_Basis_Func.js';
import { ShaderIdSrc } from './WGSL_Pick_VS_FS.js';
import { vec2, vec3, vec4, mat3, utils } from 'wgpu-matrix';
import objectVertices from './Image/vertices.json' with {type: "json"};
import objectColors from './Image/colors.json' with {type: "json"};

function findInterval(knotList, point) {
    let returnIndex = 0;
    let floorPoint = Math.floor(point);

    for (let i = 0; i < knotList.length; ++i) {
        if (floorPoint == knotList[i])
            returnIndex = i;
    }

    return returnIndex;
}

async function SelectControlPoint(device, pipelineId, pickVertexBuffer, idVertexBuffer, idRenderTexture,
    bufferPicking, bindGroupPick, idMVPUniform, idReadBuffer, control_points, idTypedArray, clickPoint)
{
    const encoder = device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
        label: "rener pass to render id",
        colorAttachments: [{
            view: idRenderTexture.createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: "store",
        }],
    });

    renderPass.setPipeline(pipelineId);
    
    // control_points: canvas size
    // clickPoint: canvas size
    // need to make MVP
    
    let MVP = mat3.translation([-clickPoint.x, -clickPoint.y, 0]);
    device.queue.writeBuffer(idMVPUniform, 0, MVP);
    
    // id를 uniform buffer로 하지 말고 vertex attribute로 만들기
    device.queue.writeBuffer(pickVertexBuffer, 0, control_points);
    device.queue.writeBuffer(idVertexBuffer, 0, idTypedArray);

    renderPass.setVertexBuffer(0, pickVertexBuffer);
    renderPass.setVertexBuffer(1, idVertexBuffer);
    renderPass.setBindGroup(0, bindGroupPick);
    renderPass.draw(control_points.length);
    renderPass.end();
    
    encoder.copyTextureToBuffer(
        {
            texture: idRenderTexture,
            origin: [0, 0]
        },
        {
            buffer: bufferPicking,
        },
        {
            width: 1,
        },
    );
    
    // encoder.copyBufferToBuffer(idVertexBuffer, 0, idReadBuffer, 0, idReadBuffer.size);

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    await bufferPicking.mapAsync(GPUMapMode.READ);

    const pixel = new Uint8Array(bufferPicking.getMappedRange().slice());
    console.log(`pixel : ${pixel}`);
    
    bufferPicking.unmap();
    
    // await idReadBuffer.mapAsync(GPUMapMode.READ);
    
    // const idBufferArray = new Float32Array(idReadBuffer.getMappedRange());
    // console.log(idBufferArray);
    
    // idReadBuffer.unmap();

    return pixel[0];
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
    
    let controlPointSizeRatio = 100;
    let maxWidth = maxRange;
    let maxHeight = maxRange;
    if (aspect > 1)
        maxWidth = maxRange / aspect;
    else
        maxHeight = maxRange * aspect;
    
    // control points
    const cpsWidth = 10;
    const cpsHeight = 10;
    const offsetX = maxWidth * 2 / (cpsWidth - 1);
    const offsetY = maxHeight * 2 / (cpsHeight - 1);
    
    async function loadImageBitmap(url) {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    }
    
    // image
    const pinguImageUrl = './Image/pingu.jpg';
    const pinguImage = await loadImageBitmap(pinguImageUrl);
    const imageWidth = pinguImage.width;
    const imageHeight = pinguImage.height;
    console.log(imageWidth, imageHeight);
    console.log(objectVertices);
    console.log(objectColors);
    
    // TypedArrays
    // control points - positions in NDC for 2d
    const controlPointUnitSize = 2 * 4;         // vec2<f32>
    const controlPointsSize = controlPointUnitSize * cpsHeight * cpsWidth;
    let controlPoints = [];
    let points = [
        [-1, -1],      // left bottom
        [1, -1],      // right bottom
        [-1, 1],      // left top
        [-1, 1],
        [1, -1],
        [1, 1],      // right top
    ];
    
    // control points - positions in NDC for 2d
    for (let v = 0; v < cpsHeight; ++v) {
        for (let u = 0; u < cpsWidth; ++u) {
            controlPoints.push([-maxWidth + offsetX * u, -maxHeight + offsetY * v]);
        }
    }
    const cpsTypedArray = new Float32Array(controlPoints.flat());
    
    // control points to box image
    const controlPointsBoxesNum = points.length * cpsHeight * cpsWidth;
    let controlPointsBoxes = [];
    for (let v = 0; v < cpsHeight; ++v) {
        for (let u = 0; u < cpsWidth; ++u) {
            for (let i = 0; i < points.length; ++i)
                controlPointsBoxes.push([points[i][0] / 100 - maxWidth + offsetX * u, points[i][1] / 100 - maxHeight + offsetY * v]);
        }
    }
    const cpsBoxTypedArray = new Float32Array(controlPointsBoxes.flat());
    console.log('controlPointsBoxes', controlPointsBoxes);
    console.log('controlPointsBoxesLength', controlPointsBoxes.length);
    
    // id values to rgb values
    const idTypedArray = new Float32Array(controlPointsBoxesNum);
    for (let i = 0; i < controlPoints.length; i++)
        for (let j = 0; j < points.length; j++)
            idTypedArray.set([(i + 1) / 255.0], i);

    // degree
    const degree = 3;

    // knots
    const knotNumbers = cpsWidth + degree - 1;
    const knotArray = [];
    for (let i = 0; i < knotNumbers; ++i) {
        knotArray[i] = i;
    }

    // calculate domain knots
    const start = degree - 1;                       // domain start point
    const end = knotArray.length - degree;          // domain end point
    const domainNum = end - start + 1;              // domain knots number

    // draw points
    const triangleNum = objectVertices.length;
    const drawPointsNum = triangleNum * 3;
    const drawPointsArray = [];
    for (let i = 0; i < triangleNum; i++) {
        for (let j = 0; j < 3; j++) {
            drawPointsArray.push([Number(objectVertices[i][j][0] / imageWidth) * (domainNum - 1) + start,
                                (Number(objectVertices[i][j][1] / imageHeight * 2 - 1) * (-1) + 1) / 2 * (domainNum - 1) + start]); // flip y
        }
    }
    const drawPointsTypedArray = new Float32Array(drawPointsArray.flat());
    console.log('drawPointsArray', drawPointsArray);
    console.log('drawPointsNum', drawPointsNum);
    
    // colors
    const controlPointsBoxesColorsLength = controlPointsBoxesNum;
    const controlPointsColors = [];
    for (let i = 0; i < controlPointsBoxesColorsLength; ++i) {
        controlPointsColors.push([0, 0.7, 0.7, 1]);
    }
    console.log('controlPointsColors', controlPointsColors);
    console.log('controlPointsBoxesColorsLength', controlPointsBoxesColorsLength);
    
    const colorTriangleNum = objectColors.length;
    const colorCoordsArray = [];
    for (let i = 0; i < colorTriangleNum; i++) {
        for (let j = 0; j < 3; j++) {
            colorCoordsArray.push([objectColors[i][j][0], objectColors[i][j][1], objectColors[i][j][2], 1]);
        }
    }
    const colorsArray = colorCoordsArray.concat(controlPointsColors);
    const colorsTypedArray = new Float32Array(colorsArray.flat());
    
    console.log('colorCoordsArray', colorCoordsArray);
    console.log('colorCoordsArrayLength', colorCoordsArray.length);
    console.log('colorsArray', colorsArray);
    console.log('colorsArrayLength', colorsArray.length);

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

    const idShaderModule = device.createShaderModule({
        label: 'Id Vertex Shader Module',
        code: ShaderIdSrc(),
    });
    
    const computeShaderModule = device.createShaderModule({
        label: 'B Spline Surface Compute Module',
        code: computeShaderSrc(degree, cpsWidth, cpsHeight, tempWidth),
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
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ],
                },
                {
                    arrayStride: 4 * 4, // 4 floats, 4 bytes each
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 1, offset: 0, format: 'float32x4' },  // color
                    ],
                },
            ],
        },
        fragment: {
            module: fragmentShaderModule,
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'triangle-list',
        },
    });
    
    const idRenderPipeline = device.createRenderPipeline({
        label: 'Id Render Pipeline',
        layout: 'auto',
        vertex: {
            module: idShaderModule,
            entryPoint: 'vs',
            buffers: [
                {
                    arrayStride: 2 * 4, // 2 floats, 4 bytes each
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ],
                },
                {
                    arrayStride: 1 * 4, // 1 floats, 4bytes each
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 1, offset: 0, format: 'float32' },    // id
                    ]
                }
            ],
        },
        fragment: {
            module: idShaderModule,
            entryPoint: 'fs',
            targets: [{ format: 'r8unorm' }],
        },
        primitive: {
            topology: 'triangle-list',
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
    
    const inputBuffer = device.createBuffer({
        label: 'compute shader input data buffer',
        size: drawPointsTypedArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inputBuffer, 0, drawPointsTypedArray);

    const intervalBuffer = device.createBuffer({
        label: 'uIntervals buffer',
        size: drawPointsTypedArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(intervalBuffer, 0, intervalTypedArray);

    const outputBuffer = device.createBuffer({
        label: 'output buffer',
        size: drawPointsTypedArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    // debug compute result buffer
    const computeResultBuffer = device.createBuffer({
        label: 'computeResult buffer',
        size: drawPointsTypedArray.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // compute shader에서 knotBuffer를 de boor algorithm에서는 사용했지만, 여기서는 사용하지 않는데
    // compute shader에서 사용하지 않는 buffer를 bindGroup에 넣으면 오류가 발생한다.
    const computeBindGroup = device.createBindGroup({
        label: 'bindGroup for compute shader',
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: controlPointsBuffer } },
            { binding: 1, resource: { buffer: inputBuffer } },
            { binding: 2, resource: { buffer: intervalBuffer } },
            { binding: 3, resource: { buffer: outputBuffer } },
        ]
    });

    // VS input buffer
    const vertexPointBuffer = device.createBuffer({
        label: 'vertex buffer',
        size: cpsBoxTypedArray.byteLength + drawPointsTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    
    const vertexColorBuffer = device.createBuffer({
        label: 'vertex buffer',
        size: colorsTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexColorBuffer, 0, colorsTypedArray);
    
    // picking Id buffer
    const pickVertexBuffer = device.createBuffer({
        label: 'picking vertex buffer',
        size: cpsBoxTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    
    const idVertexBuffer = device.createBuffer({
        label: 'picking id vertex buffer',
        size: cpsBoxTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    const idMVPUniform = device.createBuffer({
        label: 'picking MVP uniform buffer',
        size: 4 * 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    
    const bufferPicking = device.createBuffer({
        label: "buffer to read the pixel at the mouse location",
        size: 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    
    const idReadBuffer = device.createBuffer({
        label: "buffer to read the id",
        size: cpsBoxTypedArray.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    
    const bindGroupPick = device.createBindGroup({
        label: "picking id bindgroup",
        layout: idRenderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: idMVPUniform } },
        ],
    });
    
    // github 2c7d497 버전의 문제점
    // 1. testIntersection 함수는 clickPoint(맨 처음의 mouse down 이벤트 때의 좌표) 기준으로만 작동한다.
    // 2. testIntersection 함수는 마우스 드래그 이벤트마다 호출되는데, 매 번 for문으로 control points를 탐색해서 연산량이 과했다.
    // canvas mouse drag values
    let drag = false;
    let clickPos = { x: -100, y: -100 };
    let dragStart = { x: -100, y: -100 };
    let dragEnd = { x: -100, y: -100 };
    let mouseDx = 0;
    let mouseDy = 0;
    let selectedPointIndex = -1;

    // canvas mouse event
    canvas.addEventListener('mousedown', async function (event) {
        clickPos = {
            x: event.clientX / canvas.width * 2 - 1,
            y: -(event.clientY / canvas.height * 2 - 1)
        }
        // clickPos = {
        //     x: event.clientX,
        //     y: event.clientY
        // }
        dragStart = {
            x: event.clientX / canvas.width * 2 - 1,
            y: -(event.clientY / canvas.height * 2 - 1)
        }
        dragEnd = {
            x: event.clientX / canvas.width * 2 - 1,
            y: -(event.clientY / canvas.height * 2 - 1)
        }
        
        console.log(`clickPos: ${clickPos.x}, ${clickPos.y}`);

        const idRenderTexture = device.createTexture({
            size: [1, 1],
            format: 'r8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        });
        
        drag = true;
        
        // SelectControlPoint() is in range (1 ~ idLength) or 0. so it should subtract 1;
        selectedPointIndex = await SelectControlPoint(device, idRenderPipeline, pickVertexBuffer, idVertexBuffer,
            idRenderTexture, bufferPicking, bindGroupPick, idMVPUniform, idReadBuffer, cpsBoxTypedArray, idTypedArray, clickPos);
        selectedPointIndex--;
        
        canvas.addEventListener('mousemove', HandleMouseMove);
        canvas.addEventListener('mouseup', HandleMouseUp);
    });

    function HandleMouseMove(event) {
        if (drag && selectedPointIndex !== -1) {
            dragEnd = {
                x: event.clientX / canvas.width * 2 - 1,
                y: -(event.clientY / canvas.height * 2 - 1)
            }

            mouseDx = dragEnd.x - dragStart.x;
            mouseDy = dragEnd.y - dragStart.y;
            dragStart = dragEnd;

            cpsTypedArray[selectedPointIndex * 2 + 0] += mouseDx;
            cpsTypedArray[selectedPointIndex * 2 + 1] += mouseDy;1
            
            cpsBoxTypedArray[selectedPointIndex * 6 + 0] += mouseDx;
            cpsBoxTypedArray[selectedPointIndex * 6 + 1] += mouseDy;
            cpsBoxTypedArray[selectedPointIndex * 6 + 2] += mouseDx;
            cpsBoxTypedArray[selectedPointIndex * 6 + 3] += mouseDy;
            cpsBoxTypedArray[selectedPointIndex * 6 + 4] += mouseDx;
            cpsBoxTypedArray[selectedPointIndex * 6 + 5] += mouseDy;
            cpsBoxTypedArray[selectedPointIndex * 6 + 6] += mouseDx;
            cpsBoxTypedArray[selectedPointIndex * 6 + 7] += mouseDy;
            cpsBoxTypedArray[selectedPointIndex * 6 + 8] += mouseDx;
            cpsBoxTypedArray[selectedPointIndex * 6 + 9] += mouseDy;
            cpsBoxTypedArray[selectedPointIndex * 6 + 10] += mouseDx;
            cpsBoxTypedArray[selectedPointIndex * 6 + 11] += mouseDy;
        }
    }

    function HandleMouseUp() {
        if (drag) {
            dragEnd = {
                x: -100,
                y: -100
            }
            dragStart = {
                x: -100,
                y: -100
            }
            mouseDx = 0;
            mouseDy = 0;
            drag = false;
            selectedPointIndex = -1;

            canvas.removeEventListener('mousemove', HandleMouseMove);
            canvas.removeEventListener('mouseup', HandleMouseUp);
        }
    }

    // Render
    async function render() {
        const encoder = device.createCommandEncoder({ label: "encoder" });
        
        {
            const computePass = encoder.beginComputePass({ label: "compute pass" });

            computePass.setPipeline(computePipeline);
            
            device.queue.writeBuffer(controlPointsBuffer, 0, cpsTypedArray);
            computePass.setBindGroup(0, computeBindGroup);
            computePass.dispatchWorkgroups(80);
            computePass.end();
        }
        
        // copy compute shader results to map
        encoder.copyBufferToBuffer(outputBuffer, 0, computeResultBuffer, 0, computeResultBuffer.size);
        
        // copy compute shader results to vertex buffer
        encoder.copyBufferToBuffer(outputBuffer, 0, vertexPointBuffer, 0, drawPointsTypedArray.byteLength);
        device.queue.writeBuffer(vertexPointBuffer, drawPointsTypedArray.byteLength, cpsBoxTypedArray);
        
        // draw image
        // draw control points
        {
            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
            const renderPass = encoder.beginRenderPass(renderPassDescriptor);

            renderPass.setPipeline(renderPipeline);
            renderPass.setVertexBuffer(0, vertexPointBuffer);
            renderPass.setVertexBuffer(1, vertexColorBuffer);
            renderPass.draw(drawPointsNum + controlPointsBoxesNum);
            
            renderPass.end();
        }
        
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        
        // check compute shader output
        // console.log('compute shader control points', cpsTypedArray);
        // console.log('compute shader knot points', knotTypedArray);
        // console.log('compute shader draw points', drawPointsTypedArray);
        // console.log('compute shader interaval points', intervalTypedArray);
        
        // await computeResultBuffer.mapAsync(GPUMapMode.READ);
        // const result = new Float32Array(computeResultBuffer.getMappedRange());

        // console.log('compute shader result', result);
        
        // computeResultBuffer.unmap();
        
        requestAnimationFrame(render);
    }
    
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
            requestAnimationFrame(render);
        }
    });
    observer.observe(canvas);
}
main();