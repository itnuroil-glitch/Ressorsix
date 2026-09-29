import zipfile
import xml.etree.ElementTree as ET
import os
import sys

docx_path = r"C:\Users\Nuroil PC - 019\Desktop\vehicle doc\primises\Premises_Module_PRD.docx"

if not os.path.exists(docx_path):
    print(f"File not found: {docx_path}")
    sys.exit(1)

try:
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        
        # XML namespace for WordprocessingML
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        paragraphs = []
        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        
        full_text = '\n'.join(paragraphs)
        output_txt_path = os.path.join(os.path.dirname(__file__), "Premises_Module_PRD_extracted.txt")
        with open(output_txt_path, "w", encoding="utf-8") as out:
            out.write(full_text)
            
        print("EXTRACTION_SUCCESS")
        print(f"Total paragraphs extracted: {len(paragraphs)}")
        print(full_text[:2000]) # Print first 2000 characters
except Exception as e:
    print(f"Error reading docx: {e}")
