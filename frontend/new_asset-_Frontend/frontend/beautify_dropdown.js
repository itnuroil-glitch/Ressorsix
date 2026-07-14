const fs = require('fs');
const path = './src/components/CustomFieldsTab.js';
let code = fs.readFileSync(path, 'utf8');

const customDropdownCode = `
const FIELD_OPTIONS = [
  { label: 'Textbox', value: 'Textbox' },
  { label: 'Textarea', value: 'Textarea' },
  { label: 'Number', value: 'Number' },
  { label: 'Decimal', value: 'Decimal' },
  { label: 'Date', value: 'Date' },
  { label: 'Time', value: 'Time' },
  { label: 'DateTime', value: 'DateTime' },
  { label: 'Dropdown', value: 'Dropdown' },
  { label: 'Radio Button', value: 'Radio Button' },
  { label: 'Checkbox', value: 'Checkbox' },
  { label: 'Toggle/Switch', value: 'Toggle/Switch' },
  { label: 'Email', value: 'Email' },
  { label: 'URL', value: 'URL' },
  { label: 'Phone', value: 'Phone' },
  { label: 'File Upload', value: 'File Upload' },
  { label: 'Image Upload', value: 'Image Upload' },
  { label: 'Signature', value: 'Signature' },
  { label: 'Auto-generated ID', value: 'Auto-generated ID' },
  { label: 'Rich Text Editor', value: 'Rich Text Editor' },
  { label: 'Section Break', value: 'Section Break' },
  { label: 'Hidden Field', value: 'Hidden Field' }
];

const CustomDropdown = ({ selectedValue, onValueChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === selectedValue)?.label || 'Select...';

  return (
    <View style={{ flex: 1, zIndex: isOpen ? 9999 : 1, position: 'relative' }}>
      <TouchableOpacity 
        style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }}>{selectedLabel}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
      </TouchableOpacity>

      {isOpen && (
        <View style={{ 
          position: 'absolute', 
          top: '100%', 
          left: -1, 
          right: -1, 
          backgroundColor: '#FFFFFF', 
          borderWidth: 1, 
          borderColor: '#CBD5E1', 
          borderRadius: 6, 
          maxHeight: 220, 
          zIndex: 10000,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
          marginTop: 2
        }}>
          <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 220 }}>
            {options.map((opt, i) => (
              <TouchableOpacity 
                key={opt.value} 
                style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: i === options.length - 1 ? 0 : 1, borderBottomColor: '#F1F5F9', backgroundColor: selectedValue === opt.value ? '#F0F9FF' : '#FFFFFF' }}
                onPress={() => {
                  onValueChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <Text style={{ fontSize: 12, color: selectedValue === opt.value ? '#0284C7' : '#334155', fontWeight: selectedValue === opt.value ? '600' : '400' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};
`;

if (!code.includes('const CustomDropdown')) {
  code = code.replace('export default function CustomFieldsTab() {', customDropdownCode + '\nexport default function CustomFieldsTab() {');
}

const oldPickerRegex1 = /<Picker\s+selectedValue=\{field\.type\}\s+onValueChange=\{\(val\) => updateField\(activeSection\.id, field\.id, 'type', val\)\}\s+style=\{\{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, outline: 'none', fontSize: 12 \}\}\s*>[\s\S]*?<\/Picker>/g;

code = code.replace(oldPickerRegex1, '<CustomDropdown selectedValue={field.type} onValueChange={(val) => updateField(activeSection.id, field.id, \'type\', val)} options={FIELD_OPTIONS} />');

const oldPickerRegex2 = /<Picker\s+selectedValue=\{sf\.type\}\s+onValueChange=\{\(val\) => updateSubsectionFieldInField\(activeSection\.id, field\.id, sub\.id, sf\.id, 'type', val\)\}\s+style=\{\{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, outline: 'none', fontSize: 12 \}\}\s*>[\s\S]*?<\/Picker>/g;

code = code.replace(oldPickerRegex2, '<CustomDropdown selectedValue={sf.type} onValueChange={(val) => updateSubsectionFieldInField(activeSection.id, field.id, sub.id, sf.id, \'type\', val)} options={FIELD_OPTIONS} />');

fs.writeFileSync(path, code);
console.log('Replaced successfully');
