import xml.etree.ElementTree as ET
import json

# with linear gradients
# parse the SVG file as an XML tree
tree = ET.parse('WebGPU---B-Spline-Surface/2D Image Deformation/Image/triangulated-image_gradient.svg')
root = tree.getroot()

# image size
imageSize = [int(root.attrib.get('width')), int(root.attrib.get('height'))]

# linearGradients - colors
linearGradients = []
for child in root.find('{http://www.w3.org/2000/svg}defs').findall('{http://www.w3.org/2000/svg}linearGradient'):
    linearGradient = []
    linearGradient.append([float(child.attrib.get('x1').strip('%')), float(child.attrib.get('y1').strip('%'))])
    linearGradient.append([float(child.attrib.get('x2').strip('%')), float(child.attrib.get('y2').strip('%'))])

    linearGradient[0].insert(2, child[0].attrib.get('stop-color'))
    linearGradient[1].insert(2, child[1].attrib.get('stop-color'))

    linearGradients.append(linearGradient)
    
# polygons - vertices & indices
polygonsLG = []
for child in root.findall('{http://www.w3.org/2000/svg}polygon'):
    points = []
    pointsStr = child.attrib.get('points')

    for point in pointsStr.split(' '):
        x, y = point.split(',')
        polygonsLG.append((int(x), int(y)))

def ordered_unique_list(input_list):
    input_dic = {}
    r_list = []
    for i, v in enumerate(input_list):
        get_value = input_dic.get(v, None)
        if get_value == None:
            input_dic[v] = i
            r_list.append(v)
    return r_list, input_dic

verticesLG, directVerticesLG = ordered_unique_list(polygonsLG)
indicesLG = [directVerticesLG[point] for point in polygonsLG]
colorIndicesLG = [color for color in range(len(polygonsLG) // 3)]

print('with linearGradients')
print(len(linearGradients))
print(len(polygonsLG), len(verticesLG), len(indicesLG), len(colorIndicesLG))

# create the JSON structure
data_with_gradient = {
    'imageSize': imageSize,
    'linearGradients': linearGradients,
    'polygons': {
        'vertices': verticesLG,
        'indices': indicesLG,
        'colorIndices': colorIndicesLG
    }
}

# without linear gradients
# parse the SVG file as an XML tree
tree = ET.parse('WebGPU---B-Spline-Surface/2D Image Deformation/Image/triangulated-image.svg')
root = tree.getroot()

# image size
imageSize = [int(root.attrib.get('width')), int(root.attrib.get('height'))]

# fills - colors
fills = []

# polygons - vertices & indices
polygons = []
for child in root.findall('{http://www.w3.org/2000/svg}polygon'):
    points = []
    pointsStr = child.attrib.get('points')

    for point in pointsStr.split(' '):
        x, y = point.split(',')
        polygons.append((int(x), int(y)))
        
    # fill the list 'fills'
    color = child.attrib.get('fill').lstrip('#')
    fills.append(tuple(int(color[i:i+2], 16) for i in (0, 2, 4)))

vertices, directVertices = ordered_unique_list(polygons)
indices = [directVertices[point] for point in polygons]

print('without linearGradients')
print(len(polygons), len(vertices), len(indices), len(fills))

data_without_gradient = {
    'imageSize': imageSize,
    'polygons': {
        'vertices': vertices,
        'indices': indices,
        'colors': fills
    }
}

# write the JSON data to a file
# with linear gradients
file_path = './WebGPU---B-Spline-Surface/2D Image Deformation/Image/triangulated_pingu_with_linearGradient.json'
with open(file_path, 'w') as f:
    json.dump(data_with_gradient, f, indent="\t")

# without linear gradients
file_path = './WebGPU---B-Spline-Surface/2D Image Deformation/Image/triangulated_pingu_without_linearGradient.json'
with open(file_path, 'w') as f:
    json.dump(data_without_gradient, f, indent="\t")