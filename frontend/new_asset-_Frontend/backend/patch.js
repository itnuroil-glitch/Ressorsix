const fs = require('fs');

const file = 'c:\\asset-nuroil-main\\asset-nuroil-main\\frontend\\src\\components\\CustomFieldsTab.js';
let content = fs.readFileSync(file, 'utf8');

// 1. In openModal, initialize optionsArr
content = content.replace(
  /if \(!Array\.isArray\(parsedSections\) \|\| parsedSections\.length === 0\) \{\s*parsedSections = \[\{ id: Date\.now\(\)\.toString\(\), name: '', fields: \[\] \}\];\s*\}/g,
  `if (!Array.isArray(parsedSections) || parsedSections.length === 0) {
        parsedSections = [{ id: Date.now().toString(), name: '', fields: [] }];
      }
      parsedSections = parsedSections.map(s => ({
        ...s,
        fields: (s.fields || []).map(f => ({
          ...f,
          optionsArr: f.options ? f.options.split(',').map(o => o.trim()) : [],
          subsections: (f.subsections || []).map(sub => ({
            ...sub,
            fields: (sub.fields || []).map(sf => ({
              ...sf,
              optionsArr: sf.options ? sf.options.split(',').map(o => o.trim()) : []
            }))
          }))
        }))
      }));`
);

// 2. In handleSave, convert optionsArr back to options
content = content.replace(
  /const payload = \{ clientid: formClientId, moduleid: formModuleId, countryid: formCountryId, status: formStatus, field_data: sections \};/g,
  `const payloadSections = sections.map(s => ({
        ...s,
        fields: s.fields.map(f => ({
          ...f,
          options: (f.optionsArr || []).filter(o => o.trim() !== '').join(','),
          subsections: (f.subsections || []).map(sub => ({
            ...sub,
            fields: (sub.fields || []).map(sf => ({
              ...sf,
              options: (sf.optionsArr || []).filter(o => o.trim() !== '').join(',')
            }))
          }))
        }))
      }));
      const payload = { clientid: formClientId, moduleid: formModuleId, countryid: formCountryId, status: formStatus, field_data: payloadSections };`
);

// 3. Update addFieldToSection
content = content.replace(
  /fields: \[\.\.\.\(s\.fields \|\| \[\]\), \{ id: Date\.now\(\)\.toString\(\), name: '', type: 'Textbox', isRequired: false, isActive: true, sort: '0' \}\]/g,
  `fields: [...(s.fields || []), { id: Date.now().toString(), name: '', type: 'Textbox', isRequired: false, isActive: true, sort: '0', optionsArr: [] }]`
);

// 4. Update addFieldToSubsectionInField
content = content.replace(
  /fields: \[\.\.\.\(sub\.fields \|\| \[\]\), \{ id: Date\.now\(\)\.toString\(\), name: '', type: 'Textbox', isRequired: false, isActive: true, sort: '0' \}\]/g,
  `fields: [...(sub.fields || []), { id: Date.now().toString(), name: '', type: 'Textbox', isRequired: false, isActive: true, sort: '0', optionsArr: [] }]`
);

// 5. Add rendering for sections fields options
const sectionOptionsBlock = `
                                  {(['Dropdown', 'Radio Button', 'Checkbox'].includes(field.type)) && (
                                    <View style={{ width: '100%', marginTop: 8, paddingLeft: 4 }}>
                                      <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>Options</Text>
                                      {(field.optionsArr || []).map((opt, optIndex) => (
                                        <View key={\`opt-\${field.id}-\${optIndex}\`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                                          <TextInput
                                            style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 6, fontSize: 12 }]}
                                            placeholder={\`Option \${optIndex + 1}\`}
                                            placeholderTextColor={COLORS.textMuted}
                                            value={opt}
                                            onChangeText={(val) => {
                                              const newOpts = [...(field.optionsArr || [])];
                                              newOpts[optIndex] = val.replace(/,/g, '');
                                              updateField(activeSection.id, field.id, 'optionsArr', newOpts);
                                            }}
                                          />
                                          <TouchableOpacity onPress={() => {
                                            const newOpts = [...(field.optionsArr || [])];
                                            newOpts.splice(optIndex, 1);
                                            updateField(activeSection.id, field.id, 'optionsArr', newOpts);
                                          }} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 4 }}>
                                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                          </TouchableOpacity>
                                        </View>
                                      ))}
                                      <TouchableOpacity 
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                                        onPress={() => {
                                          const newOpts = [...(field.optionsArr || []), ''];
                                          updateField(activeSection.id, field.id, 'optionsArr', newOpts);
                                        }}
                                      >
                                        <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                                        <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 12 }}>Add Option</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
`;
content = content.replace(
  /\{\(\['File Upload', 'Image Upload'\]\.includes\(field\.type\)\) && \(/,
  sectionOptionsBlock + "\n                                  {(['File Upload', 'Image Upload'].includes(field.type)) && ("
);

// 6. Add rendering for subsection fields options
const subsectionOptionsBlock = `
                            {(['Dropdown', 'Radio Button', 'Checkbox'].includes(sf.type)) && (
                              <View style={{ width: '100%', marginTop: 8, paddingLeft: 4 }}>
                                <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>Options</Text>
                                {(sf.optionsArr || []).map((opt, optIndex) => (
                                  <View key={\`opt-\${sf.id}-\${optIndex}\`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                                    <TextInput
                                      style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 6, fontSize: 12 }]}
                                      placeholder={\`Option \${optIndex + 1}\`}
                                      placeholderTextColor={COLORS.textMuted}
                                      value={opt}
                                      onChangeText={(val) => {
                                        const newOpts = [...(sf.optionsArr || [])];
                                        newOpts[optIndex] = val.replace(/,/g, '');
                                        updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'optionsArr', newOpts);
                                      }}
                                    />
                                    <TouchableOpacity onPress={() => {
                                      const newOpts = [...(sf.optionsArr || [])];
                                      newOpts.splice(optIndex, 1);
                                      updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'optionsArr', newOpts);
                                    }} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 4 }}>
                                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                                <TouchableOpacity 
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                                  onPress={() => {
                                    const newOpts = [...(sf.optionsArr || []), ''];
                                    updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'optionsArr', newOpts);
                                  }}
                                >
                                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                                  <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 12 }}>Add Option</Text>
                                </TouchableOpacity>
                              </View>
                            )}
`;

content = content.replace(
  /\{\(\['File Upload', 'Image Upload'\]\.includes\(sf\.type\)\) && \(/,
  subsectionOptionsBlock + "\n                            {(['File Upload', 'Image Upload'].includes(sf.type)) && ("
);

fs.writeFileSync(file, content);
console.log('Patched CustomFieldsTab.js successfully');
