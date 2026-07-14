const fs = require('fs');
const path = './src/components/CustomFieldsTab.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace the subsection state functions
const newFunctions = `
  const addSubsectionToField = (sectionId, fieldId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return { ...f, subsections: [...(f.subsections || []), { id: Date.now().toString(), name: '', fields: [] }] };
            }
            return f;
          })
        };
      }
      return s;
    }));
  };

  const removeSubsectionFromField = (sectionId, fieldId, subId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return { ...f, subsections: (f.subsections || []).filter(sub => sub.id !== subId) };
            }
            return f;
          })
        };
      }
      return s;
    }));
  };

  const updateSubsectionNameInField = (sectionId, fieldId, subId, name) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return { ...f, subsections: (f.subsections || []).map(sub => sub.id === subId ? { ...sub, name } : sub) };
            }
            return f;
          })
        };
      }
      return s;
    }));
  };

  const addFieldToSubsectionInField = (sectionId, fieldId, subId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return {
                ...f,
                subsections: (f.subsections || []).map(sub => {
                  if (sub.id === subId) {
                    return { ...sub, fields: [...(sub.fields || []), { id: Date.now().toString(), name: '', type: 'Text', isRequired: false, isActive: true, sort: '0' }] };
                  }
                  return sub;
                })
              };
            }
            return f;
          })
        };
      }
      return s;
    }));
  };

  const removeFieldFromSubsectionInField = (sectionId, fieldId, subId, subFieldId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return {
                ...f,
                subsections: (f.subsections || []).map(sub => {
                  if (sub.id === subId) {
                    return { ...sub, fields: (sub.fields || []).filter(sf => sf.id !== subFieldId) };
                  }
                  return sub;
                })
              };
            }
            return f;
          })
        };
      }
      return s;
    }));
  };

  const updateSubsectionFieldInField = (sectionId, fieldId, subId, subFieldId, key, value) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return {
                ...f,
                subsections: (f.subsections || []).map(sub => {
                  if (sub.id === subId) {
                    return {
                      ...sub,
                      fields: (sub.fields || []).map(sf => sf.id === subFieldId ? { ...sf, [key]: value } : sf)
                    };
                  }
                  return sub;
                })
              };
            }
            return f;
          })
        };
      }
      return s;
    }));
  };
`;

code = code.replace(/const addSubsection = \[\s\S]*?(?=useEffect)/, newFunctions + '\n  ');

// 2. Change the button on the field row to call addSubsectionToField
code = code.replace(/onPress=\{\(\) => addSubsection\(activeSection\.id\)\}/g, "onPress={() => addSubsectionToField(activeSection.id, field.id)}");

// 3. Move the rendering of subsections into the field map, and remove the bottom section entirely.
const renderSubsectionsStr = `
                                    {/* Subsections under Field */}
                                    {(field.subsections || []).length > 0 && (
                                      <View style={{ marginLeft: 24, marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#CBD5E1', paddingBottom: 8, width: '100%' }}>
                                        {(field.subsections || []).map((sub, subIndex) => (
                                          <View key={sub.id} style={{ marginBottom: 12, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                              <TextInput 
                                                style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF' }]} 
                                                placeholder="Subsection Name" 
                                                placeholderTextColor={COLORS.textMuted}
                                                value={sub.name} 
                                                onChangeText={(val) => updateSubsectionNameInField(activeSection.id, field.id, sub.id, val)} 
                                              />
                                              <TouchableOpacity onPress={() => removeSubsectionFromField(activeSection.id, field.id, sub.id)} style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                              </TouchableOpacity>
                                            </View>
          
                                            {(sub.fields || []).map((sf, sfIndex) => (
                                              <View key={sf.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                                <View style={{ flexDirection: 'row', flex: 1, minWidth: 240, gap: 8 }}>
                                                  <View style={{ flex: 1.5, minWidth: 0 }}>
                                                    <TextInput 
                                                      style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#F8FAFC', paddingVertical: 6, fontSize: 12, paddingHorizontal: 8 }]} 
                                                      placeholder="Field Name" 
                                                      placeholderTextColor={COLORS.textMuted}
                                                      value={sf.name} 
                                                      onChangeText={(val) => updateSubsectionFieldInField(activeSection.id, field.id, sub.id, sf.id, 'name', val)} 
                                                    />
                                                  </View>
                                                  <View style={{ flex: 1, minWidth: 0 }}>
                                                    <View style={[styles.dropdownSelector, { backgroundColor: '#F8FAFC', paddingVertical: 0 }]}>
                                                      <Picker
                                                        selectedValue={sf.type}
                                                        onValueChange={(val) => updateSubsectionFieldInField(activeSection.id, field.id, sub.id, sf.id, 'type', val)}
                                                        style={{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, outline: 'none', fontSize: 12 }}
                                                      >
                                                        <Picker.Item label="Text" value="Text" />
                                                        <Picker.Item label="Number" value="Number" />
                                                        <Picker.Item label="Date" value="Date" />
                                                        <Picker.Item label="Dropdown" value="Dropdown" />
                                                        <Picker.Item label="Checkbox" value="Checkbox" />
                                                      </Picker>
                                                    </View>
                                                  </View>
                                                </View>
          
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 4 }}>
                                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Req</Text>
                                                    <Switch 
                                                      value={sf.isRequired || false} 
                                                      onValueChange={(val) => updateSubsectionFieldInField(activeSection.id, field.id, sub.id, sf.id, 'isRequired', val)} 
                                                      trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                                    />
                                                  </View>
                                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Act</Text>
                                                    <Switch 
                                                      value={sf.isActive !== false} 
                                                      onValueChange={(val) => updateSubsectionFieldInField(activeSection.id, field.id, sub.id, sf.id, 'isActive', val)} 
                                                      trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                                    />
                                                  </View>
                                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 100 }}>
                                                    <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Sort</Text>
                                                    <TextInput 
                                                      style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#F8FAFC', flex: 1, paddingVertical: 4, textAlign: 'center', fontSize: 12, paddingHorizontal: 4, minWidth: 0 }]} 
                                                      placeholder="0" 
                                                      value={sf.sort?.toString() || '0'} 
                                                      onChangeText={(val) => updateSubsectionFieldInField(activeSection.id, field.id, sub.id, sf.id, 'sort', val)} 
                                                      keyboardType="numeric"
                                                    />
                                                  </View>
                                                  <TouchableOpacity onPress={() => removeFieldFromSubsectionInField(activeSection.id, field.id, sub.id, sf.id)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                                                    <Ionicons name="close" size={14} color="#EF4444" />
                                                  </TouchableOpacity>
                                                </View>
                                              </View>
                                            ))}
          
                                            <TouchableOpacity 
                                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 4 }}
                                              onPress={() => addFieldToSubsectionInField(activeSection.id, field.id, sub.id)}
                                            >
                                              <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                                              <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 12 }}>Add Field to Subsection</Text>
                                            </TouchableOpacity>
                                          </View>
                                        ))}
                                      </View>
                                    )}
`;

code = code.replace(`                                    <TouchableOpacity onPress={() => removeFieldFromSection(activeSection.id, field.id)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                                      <Ionicons name="close" size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ))}`, `                                    <TouchableOpacity onPress={() => removeFieldFromSection(activeSection.id, field.id)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                                      <Ionicons name="close" size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
${renderSubsectionsStr}
                              </View>
                              ))}`);

// Now delete the old section-level subsections block
const oldSubsectionsBlockRegex = /<View style=\{\{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 \}\}>\s*<Text style=\{\[styles\.modalLabel, \{ color: COLORS\.primary \}\]\}>Subsections<\/Text>[\s\S]*?<View style=\{\[styles\.modalInputGroup, \{ marginTop: 32 \}\]\}>/;

code = code.replace(oldSubsectionsBlockRegex, `<View style={[styles.modalInputGroup, { marginTop: 32 }]}>`);

fs.writeFileSync(path, code);
