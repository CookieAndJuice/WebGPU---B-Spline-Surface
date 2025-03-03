// Vertex Shader & Fragment Shader
export function vertexShaderSrc() {
    return /*wgsl*/`
        struct VSInput {
            @location(0) position: vec3f,
            @location(1) normal: vec3f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec3f,
            @location(1) lightDir: vec3f,
            @location(2) normal: vec3f,
            @location(3) viewDir: vec3f,
        };
        
        struct Uniforms {
            MVP: mat4x4f,
            lightDir: vec3f,
            eyePos: vec3f,
        };
        
        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        @vertex fn vs(
            vertex: VSInput
        ) -> VSOutput
        {
            var position = vertex.position;

            var vsOut: VSOutput;
            
            vsOut.position = uniforms.MVP * vec4f(position, 1);
            vsOut.color = vec3f(0.0, 0.7, 0.7);
            vsOut.lightDir = normalize(-uniforms.lightDir);
            vsOut.normal = normalize(vertex.normal);
            vsOut.viewDir = normalize(uniforms.eyePos - position);
            
            return vsOut;
        }
    `;
}

export function fragmentShaderSrc() {
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
            @location(0) color: vec3f,
            @location(1) lightDir: vec3f,
            @location(2) normal: vec3f,
            @location(3) viewDir: vec3f,
        };

        @fragment fn fs(fsIn: FSInput) -> @location(0) vec4f
        {
            var diffuseLight = max(dot(fsIn.normal, fsIn.lightDir), 0.0);
            let diffuseMaterial = vec3f(1, 1, 1);
            var diffuseColor = fsIn.color * diffuseLight * diffuseMaterial;

            var reflectDir = 2.0 * fsIn.normal * dot(fsIn.normal, fsIn.lightDir) - fsIn.lightDir;
            let shineness = 32.0;
            let specularMetalness = vec3f(0.8, 0.8, 0.8);
            var specularLight = max(dot(reflectDir, fsIn.viewDir), 0.0);
            var specularColor = pow(specularLight, shineness) * fsIn.color * specularMetalness;
            
            var ambientLight = vec3f(0.1, 0.1, 0.1);
            var ambientReflectance = vec3f(0.1, 0.1, 0.1);
            var ambientColor = ambientLight * ambientReflectance;

            var resultColor = vec4f(diffuseColor + specularColor + ambientColor, 1);

            return resultColor;
        }
    `;
}