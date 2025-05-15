import { vertexShaderSrc } from './WGSL VS_FS.js';
import { fragmentShaderSrc } from './WGSL VS_FS.js';
import { computeShaderSrc } from './WGSL Compute Shader.js';
import { ShaderIdSrc } from './WGSL Pick VS_FS.js';
import { controlPointsVertexShaderSrc } from './WGSL VS_FS Control_Points.js';
import { controlPointsFragmentShaderSrc } from './WGSL VS_FS Control_Points.js';
import *as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { vec2, vec3, vec4, mat3, mat4, utils } from 'wgpu-matrix';

function findInterval(knotList, point) {
    let returnIndex = 0;
    let floorPoint = Math.floor(point);

    for (let i = 0; i < knotList.length; ++i) {
        if (floorPoint == knotList[i])
            returnIndex = i;
    }

    return returnIndex;
}

async function load_gltf(url) {
    const loader = new GLTFLoader();

    const root = await new Promise((resolve, reject) => {
        loader.load(url,
            (model) => { resolve(model); },
            null,
            (error) => { reject(error); });
    });

    return root.scene.children[0];
}

async function SelectControlPoint(device, pipelineId, pickVertexBuffer, idVertexBuffer, idRenderTexture,
    bufferPicking, bindGroupPick, idMVPUniform, idReadBuffer, control_points, idTypedArray, clickPoint) {
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
    renderPass.draw(6, control_points.length / 2);
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
    
    // Basic Setting
    let sizeRatio = {
        x: 100,
        y: 100,
        z: 100
    };
    
    // load model file
    const ModelObject = await load_gltf('Object/Sphere.glb');
    console.log(ModelObject);
        
    // TypedArrays
    // control points - positions in 3D object space 
    const cpsWidthX = 5;
    const cpsWidthY = 5;
    const cpsHeightZ = 5;
    
    const startPoint = -2;
    const offset = 1;
    let controlPoints = [];

    for (let z = 0; z < cpsHeightZ; ++z) {
        for (let y = 0; y < cpsWidthY; ++y) {
            for (let x = 0; x < cpsWidthX; ++x)
            {
                controlPoints.push([offset * x + startPoint, offset * y + startPoint, offset * z + startPoint, 0]);
            }
        }
    }
    const controlPointUnitSize = 4 * 4;         // position - vec4<f32>
    const controlPointNum = cpsWidthX * cpsWidthY * cpsHeightZ;
    const controlPointsSize = controlPointUnitSize * controlPoints.length;
    const cpsTypedArray = new Float32Array(controlPoints.flat());
    
    console.log(controlPoints);
    
    // id values to rgb values
    const idTypedArray = new Float32Array(controlPoints.length);
    for (let i = 0; i < controlPoints.length; i++) {
        idTypedArray.set([(i + 1) / 255.0], i);
    }

    // degree
    const degree = 3;

    // knots
    const knotNumbers = cpsWidthX + degree - 1;
    const knotArray = [];
    for (let i = 0; i < knotNumbers; ++i) {
        knotArray[i] = i;
    }

    // calculate domain knots
    const start = degree - 1;                       // domain start point
    const end = knotArray.length - degree;          // domain end point
    const domainNum = end - start + 1;              // domain knots number

    // draw points
    const spherePointsArray = ModelObject.geometry.attributes.position.array;  // -1 ~ 1
    const sphereIndicesArray = ModelObject.geometry.index.array;
    const sphereNormalsArray = ModelObject.geometry.attributes.normal.array;
    
    console.log(sphereNormalsArray);
    
    const drawPointsNum = spherePointsArray.length / 3;
    
    let dpsOffset = 3;
    let x = 0, y = 0, z = 0, pointOffset = 0;
    const drawPointsArray = [];
    const originDrawPointsArray = [];
    for (let i = 0; i < drawPointsNum; ++i) {
        x = spherePointsArray[i * dpsOffset + 0];
        y = spherePointsArray[i * dpsOffset + 1];
        z = spherePointsArray[i * dpsOffset + 2];
        
        originDrawPointsArray[i] = [x, y, z];
        drawPointsArray[i] = [(x + 1) / 2 * (domainNum - 1) + start, (y + 1) / 2 * (domainNum - 1) + start, (z + 1) / 2 * (domainNum - 1) + start, pointOffset];
    }
    const drawPointsTypedArray = new Float32Array(drawPointsArray.flat());
    const drawPointsSize = drawPointsTypedArray.byteLength;
    
    console.log(originDrawPointsArray);
    
    // intervals
    const intervalArray = [];
    let xInterval = 0;
    let yInterval = 0;
    let zInterval = 0;
    for (let i = 0; i < drawPointsNum; ++i) {
        if (drawPointsArray[i][0] == knotArray[end])
            xInterval = end - 1;
        else
            xInterval = findInterval(knotArray, drawPointsArray[i][0]);

        if (drawPointsArray[i][1] == knotArray[end])
            yInterval = end - 1;
        else
            yInterval = findInterval(knotArray, drawPointsArray[i][1]);
        
        if (drawPointsArray[i][2] == knotArray[end])
            zInterval = end - 1;
        else
            zInterval = findInterval(knotArray, drawPointsArray[i][2]);
            
        intervalArray[i] = [xInterval, yInterval, zInterval, 0];
    }
    const intervalTypedArray = new Uint32Array(intervalArray.flat());  

    // uResult & tempCps size
    const tempWidth = degree + 1;
    const xResultLength = tempWidth * tempWidth;
    
    // Shader
    const vertexShaderModule = device.createShaderModule({
        label: 'B Spline Surface Vertex Module',
        code: vertexShaderSrc(),
    });

    const fragmentShaderModule = device.createShaderModule({
        label: 'B Spline Surface Fragment Module',
        code: fragmentShaderSrc(),
    });
    
    const controlPointsVertexShaderModule = device.createShaderModule({
            label: 'Control Points Vertex Module',
            code: controlPointsVertexShaderSrc(sizeRatio),
    });

    const controlPointsFragmentShaderModule = device.createShaderModule({
        label: 'Control Points Fragment Module',
        code: controlPointsFragmentShaderSrc(),
    });

    const idShaderModule = device.createShaderModule({
        label: 'Id Vertex Shader Module',
        code: ShaderIdSrc(sizeRatio),
    });
    
    const computeShaderModule = device.createShaderModule({
        label: 'B Spline Surface Compute Module',
        code: computeShaderSrc(degree, cpsWidthX, cpsWidthY, cpsHeightZ, xResultLength, tempWidth, start, end),
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
                    arrayStride: 4 * 4, // 4 floats, 4 bytes each
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x4' },  // position
                    ],
                },
                {
                    arrayStride: 3 * 4, // 3 floats, 4 bytes each
                    stepMode: 'vertex',
                    attributes: [
                        { shaderLocation: 1, offset: 0, format: 'float32x3' },  // normal
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
            cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        }
    });
    
    const controlPointsPipeline = device.createRenderPipeline({
        label: 'Control Points Render Pipeline',
        layout: 'auto',
        vertex: {
            module: controlPointsVertexShaderModule,
            buffers: [
                {
                    arrayStride: 4 * 4, // 3 floats, 4 bytes each
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' },  // position
                    ],
                },
            ]
        },
        fragment: {
            module: controlPointsFragmentShaderModule,
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        }
    });
    
    const idRenderPipeline = device.createRenderPipeline({
        label: 'Id Render Pipeline',
        layout: 'auto',
        vertex: {
            module: idShaderModule,
            entryPoint: 'vs',
            buffers: [
                {
                    arrayStride: 4 * 4, // 2 floats, 4 bytes each
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
            cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        }
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
        depthStencilAttachment: {
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
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
        size: drawPointsSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inputBuffer, 0, drawPointsTypedArray);

    const intervalBuffer = device.createBuffer({
        label: 'uIntervals buffer',
        size: drawPointsSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(intervalBuffer, 0, intervalTypedArray);

    const outputBuffer = device.createBuffer({
        label: 'output buffer',
        size: drawPointsSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    // debug compute result buffer
    const computeResultBuffer = device.createBuffer({
        label: 'computeResult buffer',
        size: drawPointsSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

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
        size: drawPointsTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    
    const vertexNormalBuffer = device.createBuffer({
        label: 'vertex normal buffer',
        size: sphereNormalsArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexNormalBuffer, 0, sphereNormalsArray);
    
    const indexBuffer = device.createBuffer({
        label: 'index buffer',
        size: sphereIndicesArray.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, sphereIndicesArray);
    
    const vertexControlPointsBuffer = device.createBuffer({
        label: 'vertex control points buffer',
        size: cpsTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    
    const mvpSize = 4 * 4 * 4;
    const lightSize = 4 * 4;
    const eyeSize = 4 * 4;
    const uniformBuffer = device.createBuffer({
        label: 'uniform buffer',
        size: mvpSize + lightSize + eyeSize,        // 4x4 matrix + light vector
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    const bindGroup = device.createBindGroup({
        label: 'bindGroup for render pipeline',
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
        ],
    });
    
    // uniform buffer datas
    const eye = [0, 0, 10];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const eyePosition = new Float32Array(eye);
    
    const fovy = utils.radToDeg(60);
    const aspect = screenWidth / screenHeight;
    const near = 0.1;
    const far = 100.0;
    
    const view = mat4.lookAt(eye, target, up);
    const projection = mat4.perspective(fovy, aspect, near, far);
    const viewProjection = mat4.multiply(projection, view);
    const lightDirection = new Float32Array([-0.5, -0.5, -0.5]);
    
    device.queue.writeBuffer(uniformBuffer, 0, viewProjection);
    device.queue.writeBuffer(uniformBuffer, mvpSize, lightDirection);
    device.queue.writeBuffer(uniformBuffer, mvpSize + lightSize, eyePosition);
    
    // texture buffers
    let depthTexture;
    
    // picking Id buffer
    const pickVertexBuffer = device.createBuffer({
        label: 'picking vertex buffer',
        size: cpsTypedArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const idVertexBuffer = device.createBuffer({
        label: 'picking id vertex buffer',
        size: idTypedArray.byteLength,
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
        size: idTypedArray.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    const bindGroupPick = device.createBindGroup({
        label: "picking id bindgroup",
        layout: idRenderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: idMVPUniform } },
        ],
    });
    
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
        //selectedPointIndex = await SelectControlPoint(device, idRenderPipeline, pickVertexBuffer, idVertexBuffer,
        //    idRenderTexture, bufferPicking, bindGroupPick, idMVPUniform, idReadBuffer, cpsTypedArray, idTypedArray, clickPos);
        //selectedPointIndex--;

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
            cpsTypedArray[selectedPointIndex * 2 + 1] += mouseDy;
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
        encoder.copyBufferToBuffer(outputBuffer, 0, vertexPointBuffer, 0, drawPointsSize);
        device.queue.writeBuffer(vertexControlPointsBuffer, 0, cpsTypedArray);
        
        {
            const canvasTexture = context.getCurrentTexture();
            renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

            if (!depthTexture ||
                depthTexture.width !== canvasTexture.width ||
                depthTexture.height !== canvasTexture.height) {
                if (depthTexture) {
                    depthTexture.destroy();
                }
                depthTexture = device.createTexture({
                    size: [canvasTexture.width, canvasTexture.height],
                    format: 'depth24plus',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                });
            }
            renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();
            
            const renderPass = encoder.beginRenderPass(renderPassDescriptor);

            // draw model
            renderPass.setPipeline(renderPipeline);
            renderPass.setVertexBuffer(0, vertexPointBuffer);
            renderPass.setVertexBuffer(1, vertexNormalBuffer);
            renderPass.setIndexBuffer(indexBuffer, "uint16");
            renderPass.setBindGroup(0, bindGroup);
            renderPass.drawIndexed(sphereIndicesArray.length);

            // draw control points
            renderPass.setPipeline(controlPointsPipeline);
            renderPass.setVertexBuffer(0, vertexControlPointsBuffer);
            renderPass.draw(6, controlPointNum);
            
            renderPass.end();
        }
        
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        
        // check compute shader output
        // console.log('compute shader control points', cpsTypedArray);
        // console.log('compute shader draw points', drawPointsArray);
        
        // await computeResultBuffer.mapAsync(GPUMapMode.READ);
        // const result = new Float32Array(computeResultBuffer.getMappedRange());

        // for (let i = 0; i < result.length; i += 4) {
        //     if (result[i] == 0 && result[i + 1] == 0 && result[i + 2] == 0 && result[i + 3] == 0)
        //         console.log('compute shader result', result[i], result[i + 1], result[i + 2], result[i + 3]);
        // }

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