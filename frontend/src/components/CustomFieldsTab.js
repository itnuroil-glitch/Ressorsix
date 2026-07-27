import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, Picker, useWindowDimensions, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export const SearchableDropdown = ({ value, onChange, data, placeholder, searchPlaceholder, displayKey, valueKey, disabled, renderOption, isMultiSelect, getIsOptionDisabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = React.useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { height: windowHeight } = useWindowDimensions();

  const selectedValues = isMultiSelect 
    ? (Array.isArray(value) ? value.map(String) : (value ? String(value).split(',').map(s => s.trim()) : []))
    : (value !== undefined && value !== null ? [String(value)] : []);

  const filteredData = data.filter(item => {
    // If the item has rawData and details, let's also search within details!
    const searchString = item[displayKey]?.toLowerCase() || '';
    let detailsString = '';
    if (item.rawData && item.rawData.details) {
       detailsString = Object.values(item.rawData.details).join(' ').toLowerCase();
    }
    return searchString.includes(searchTerm.toLowerCase()) || detailsString.includes(searchTerm.toLowerCase());
  });

  const selectedItems = data.filter(item => 
    item[valueKey] !== undefined && item[valueKey] !== null && selectedValues.includes(String(item[valueKey]))
  );

  const displayText = selectedItems.length > 0 
    ? selectedItems.map(item => item[displayKey]).join(', ')
    : placeholder;

  const spaceBelow = windowHeight - (coords.y + coords.height);
  const useBottomAlignment = false; // Always open downwards

  return (
    <View 
      ref={containerRef}
      style={{ position: 'relative', zIndex: isOpen ? 50 : 1, width: '100%' }}
    >
      <TouchableOpacity
        style={[styles.dropdownSelector, disabled && { opacity: 0.7, backgroundColor: '#F1F5F9' }]}
        onPress={() => {
          if (disabled) return;
          if (isOpen) {
            setIsOpen(false);
          } else {
            containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
              setCoords({ x: pageX, y: pageY, width, height });
              setIsOpen(true);
            });
          }
        }}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <Text style={{ color: selectedItems.length > 0 ? COLORS.textPrimary : COLORS.textMuted, fontSize: 14 }}>
          {displayText}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
 
      {isOpen && (
        <Modal
          transparent={true}
          visible={isOpen}
          animationType="none"
          onRequestClose={() => setIsOpen(false)}
        >
          {/* Full-screen overlay to close the dropdown when clicking outside */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          <View style={{
            position: 'absolute',
            ...(useBottomAlignment ? { bottom: windowHeight - coords.y + 2 } : { top: coords.y + coords.height + 2 }),
            left: coords.x,
            width: coords.width,
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: useBottomAlignment ? { width: 0, height: -4 } : { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5,
            zIndex: 10000,
            maxHeight: 200,
            overflow: 'hidden'
          }}>
            <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Ionicons name="search" size={16} color="#94A3B8" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 13, color: '#334155', outlineStyle: 'none', outlineWidth: 0 }}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus={true}
                />
              </View>
            </View>
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 130 }} keyboardShouldPersistTaps="handled">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => {
                  const isSelected = item[valueKey] !== undefined && item[valueKey] !== null && selectedValues.includes(String(item[valueKey]));
                  const isOptionDisabled = getIsOptionDisabled ? getIsOptionDisabled(item) : false;
                  return (
                    <TouchableOpacity
                      key={item[valueKey]}
                      disabled={isOptionDisabled}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: index === filteredData.length - 1 ? 0 : 1,
                        borderBottomColor: '#F1F5F9',
                        backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                        flexDirection: 'row',
                        alignItems: 'center',
                        opacity: isOptionDisabled ? 0.4 : 1
                      }}
                      onPress={() => {
                        if (isOptionDisabled) return;
                        if (isMultiSelect) {
                          let newValues;
                          if (isSelected) {
                            newValues = selectedValues.filter(v => v !== String(item[valueKey]));
                          } else {
                            newValues = [...selectedValues, String(item[valueKey])];
                          }
                          onChange(newValues.join(','));
                        } else {
                          onChange(item[valueKey]);
                          setIsOpen(false);
                          setSearchTerm('');
                        }
                      }}
                    >
                      {isMultiSelect && (
                        <Ionicons 
                          name={isSelected ? "checkbox" : "square-outline"} 
                          size={18} 
                          color={isSelected ? COLORS.primary : '#94A3B8'} 
                          style={{ marginRight: 8 }} 
                        />
                      )}
                      {renderOption ? renderOption(item, isSelected) : (
                        <Text style={{
                          fontSize: 13,
                          color: isSelected ? COLORS.primary : '#334155',
                          fontWeight: isSelected ? '600' : '400'
                        }}>
                          {item[displayKey]}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>No results found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const FIELD_OPTIONS = [
  { label: 'Textbox', value: 'Textbox' },
  { label: 'Textarea', value: 'Textarea' },
  { label: 'Number', value: 'Number' },
  { label: 'Decimal', value: 'Decimal' },
  { label: 'Date', value: 'Date' },
  { label: 'Time', value: 'Time' },
  { label: 'DateTime', value: 'DateTime' },
  { label: 'Dropdown', value: 'Dropdown' },
  { label: 'Searchable Dropdown', value: 'Searchable Dropdown' },
  { label: 'Radio Button', value: 'Radio Button' },
  { label: 'Checkbox', value: 'Checkbox' },
  { label: 'Toggle/Switch', value: 'Toggle/Switch' },
  { label: 'Single Checkbox', value: 'Single Checkbox' },
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

export const CustomDropdown = ({ selectedValue, onValueChange, options = [], disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = React.useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { height: windowHeight } = useWindowDimensions();
  
  const safeOptions = Array.isArray(options) ? options : [];
  const selectedLabel = safeOptions.find(o => o && o.value === selectedValue)?.label || 'Select...';

  const filteredOptions = safeOptions.filter(opt => 
    opt && opt.label && opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const useBottomAlignment = false; // Always open downwards

  return (
    <View 
      ref={containerRef}
      style={{ flex: 1, zIndex: isOpen ? 9999 : 1, position: 'relative' }}
    >
      <TouchableOpacity
        style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        onPress={() => {
          if (disabled) return;
          if (isOpen) {
            setIsOpen(false);
          } else {
            containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
              setCoords({ x: pageX, y: pageY, width, height });
              setIsOpen(true);
            });
          }
        }}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }}>{selectedLabel}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
      </TouchableOpacity>

      {isOpen && (
        <Modal
          transparent={true}
          visible={isOpen}
          animationType="none"
          onRequestClose={() => setIsOpen(false)}
        >
          {/* Full-screen overlay to close the dropdown when clicking outside */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          <View style={{
            position: 'absolute',
            ...(useBottomAlignment ? { bottom: windowHeight - coords.y + 2 } : { top: coords.y + coords.height + 2 }),
            left: coords.x,
            width: coords.width,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 6,
            maxHeight: 210,
            zIndex: 10000,
            shadowColor: '#000',
            shadowOffset: useBottomAlignment ? { width: 0, height: -4 } : { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
          }}>
            <View style={{ padding: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <TextInput
                style={{ paddingVertical: 6, paddingHorizontal: 8, fontSize: 12, color: '#334155', backgroundColor: '#F8FAFC', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', outlineWidth: 0 }}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoFocus={true}
              />
            </View>
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 170 }} keyboardShouldPersistTaps="handled">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: i === filteredOptions.length - 1 ? 0 : 1, borderBottomColor: '#F1F5F9', backgroundColor: selectedValue === opt.value ? '#F0F9FF' : '#FFFFFF' }}
                    onPress={() => {
                      onValueChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <Text style={{ fontSize: 12, color: selectedValue === opt.value ? '#0284C7' : '#334155', fontWeight: selectedValue === opt.value ? '600' : '400' }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>No options found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default function CustomFieldsTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [clients, setClients] = useState([]);
  const [modules, setModules] = useState([]);
  const [countries, setCountries] = useState([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formClientId, setFormClientId] = useState('');
  const [formModuleId, setFormModuleId] = useState('');
  const [formCountryId, setFormCountryId] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [saving, setSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [sections, setSections] = useState([{ id: Date.now().toString(), name: '', fields: [] }]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeSubsectionModal, setActiveSubsectionModal] = useState(null);

  const addSection = () => {
    const newId = Date.now().toString();
    setSections([...sections, { id: newId, name: '', fields: [] }]);
    setActiveSectionId(newId);
  };

  const removeSection = (sectionId) => {
    const newSections = sections.filter(s => s.id !== sectionId);
    setSections(newSections);
    if (activeSectionId === sectionId) {
      setActiveSectionId(newSections.length > 0 ? newSections[0].id : null);
    }
  };

  const updateSectionName = (sectionId, name) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, name } : s));
  };

  const addFieldToSection = (sectionId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, fields: [...s.fields, { id: Date.now().toString(), name: '', type: 'Textbox', isRequired: false, isActive: true, isSearchable: false, sort: '0' }] };
      }
      return s;
    }));
  };

  const removeFieldFromSection = (sectionId, fieldId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
      }
      return s;
    }));
  };

  const updateField = (sectionId, fieldId, key, value) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f)
        };
      }
      return s;
    }));
  };

  const addSubsectionToField = (sectionId, fieldId) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return {
                ...f,
                subsections: [...(f.subsections || []), { id: Date.now().toString(), name: '', fields: [] }]
              };
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

  const updateSubsectionTriggerValueInField = (sectionId, fieldId, subId, triggerValue) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id === fieldId) {
              return { ...f, subsections: (f.subsections || []).map(sub => sub.id === subId ? { ...sub, triggerValue } : sub) };
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
                    return { ...sub, fields: [...(sub.fields || []), { id: Date.now().toString(), name: '', type: 'Textbox', isRequired: false, isActive: true, isSearchable: false, sort: '0', optionsArr: [] }] };
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

  const removeFieldFromSubsectionInField = (sectionId, fieldId, subId, sfId) => {
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
                    return { ...sub, fields: (sub.fields || []).filter(sf => sf.id !== sfId) };
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

  const updateSubsectionFieldInField = (sectionId, fieldId, subId, sfId, key, value) => {
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
                      fields: (sub.fields || []).map(sf => sf.id === sfId ? { ...sf, [key]: value } : sf)
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


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cfRes, clientsRes, modulesRes, countriesRes] = await Promise.all([
        fetch(`${API_URL}/api/custom-fields`),
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/countries`)
      ]);
      const cfData = await cfRes.json();
      const clientsData = await clientsRes.json();
      const modulesData = await modulesRes.json();
      const countriesData = await countriesRes.json();

      setCustomFields(Array.isArray(cfData) ? cfData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setModules(Array.isArray(modulesData) ? modulesData : []);
      setCountries(Array.isArray(countriesData) ? countriesData : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading custom fields data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredFields = customFields.filter(cf => {
    const term = search.toLowerCase();
    return (
      (cf.client_name && cf.client_name.toLowerCase().includes(term)) ||
      (cf.module_name && cf.module_name.toLowerCase().includes(term)) ||
      (cf.country_name && cf.country_name.toLowerCase().includes(term))
    );
  });

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredFields.length / ITEMS_PER_PAGE)));
  const paginatedFields = filteredFields.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (!formModuleId || !formCountryId) {
      showToast('Module and Country are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payloadSections = sections.map(s => ({
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
      const payload = { clientid: formClientId || null, moduleid: formModuleId, countryid: formCountryId, status: formStatus, field_data: payloadSections };
      const url = editingId ? `${API_URL}/api/custom-fields/${editingId}` : `${API_URL}/api/custom-fields`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast('Saved successfully', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error saving custom field', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this custom field?')) return;
    try {
      const res = await fetch(`${API_URL}/api/custom-fields/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Deleted successfully', 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error deleting custom field', 'error');
    }
  };

  const openModal = (field = null) => {
    if (field) {
      setEditingId(field.id);
      setFormClientId(field.clientid);
      setFormModuleId(field.moduleid);
      setFormCountryId(field.countryid);
      setFormStatus(field.status || 'Active');

      let parsedSections = [];
      try {
        parsedSections = typeof field.field_data === 'string' ? JSON.parse(field.field_data) : field.field_data;
      } catch (e) { }
      if (!Array.isArray(parsedSections) || parsedSections.length === 0) {
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
      }));
      setSections(parsedSections);
      setActiveSectionId(parsedSections[0].id);

    } else {
      setEditingId(null);
      setFormClientId('');
      setFormModuleId('');
      setFormCountryId('');
      setFormStatus('Active');
      const newId = Date.now().toString();
      setSections([{ id: newId, name: '', fields: [] }]);
      setActiveSectionId(newId);
    }
    setWizardStep(1);
    setIsModalOpen(true);
  };



  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#ECECFE',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name="grid-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.modulesTitleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Custom Fields</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage custom fields for clients and modules.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addModuleBtn}
          onPress={() => openModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color={COLORS.white} />
          <Text style={styles.addModuleBtnText}>Add Custom Field</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search custom fields by name...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Querying PostgreSQL custom fields...</Text>
          </View>
        ) : filteredFields.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                {/* Table Header Row */}
                <View style={styles.modulesTableHeader}>
                  <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                  <Text style={[styles.thCell, { flex: 2.5 }]}>CLIENT NAME</Text>
                  <Text style={[styles.thCell, { flex: 2.0 }]}>COUNTRY NAME</Text>
                  <Text style={[styles.thCell, { flex: 2.5 }]}>MODULE NAME</Text>
                  <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>STATUS</Text>
                  <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>EDIT</Text>
                  <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>ACTION</Text>
                </View>

                {/* Table Data Rows */}
                {paginatedFields.map((item, index) => {
                  const isDeleted = item.isdelete;
                  const isInactive = item.status !== 'Active' || isDeleted;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.modulesTableRow,
                        index === paginatedFields.length - 1 && styles.lastTableRow,
                      ]}
                    >
                      <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                      <Text style={[styles.tdCell, { flex: 2.5, color: COLORS.textPrimary, fontWeight: '600' }]}>
                        {item.client_name || '-'}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 2.0, color: COLORS.textPrimary, fontWeight: '600' }]}>
                        {item.country_name || '-'}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 2.5, color: COLORS.textPrimary, fontWeight: '600' }]}>
                        {item.module_name || '-'}
                      </Text>

                      {/* Status Badge */}
                      <View style={[styles.tdCell, { flex: 1.5, alignItems: 'center' }]}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isInactive ? '#FEE2E2' : '#E0F2FE',
                              borderColor: isInactive ? '#FCA5A5' : '#7DD3FC',
                              borderWidth: 1,
                              borderRadius: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: isInactive ? '#EF4444' : '#0284C7',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isDeleted ? 'DELETED' : (item.status === 'Active' ? 'ACTIVE' : 'INACTIVE')}
                          </Text>
                        </View>
                      </View>

                      {/* Edit trigger */}
                      <TouchableOpacity
                        style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                        onPress={() => openModal(item)}
                      >
                        <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>

                      {/* Delete trigger */}
                      <TouchableOpacity
                        style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                        onPress={() => handleDelete(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View></View>
            </ScrollView>
            {renderTablePagination(filteredFields.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="grid-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{customFields.length === 0 ? "No registered custom fields found." : "No matching custom fields found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Custom Field</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { zIndex: 50, flex: 1 }]}>
              {/* Wizard Header Progress */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                {[
                  { id: 1, label: 'Basic Information', icon: 'document-text-outline' },
                  { id: 2, label: 'Field Declaration', icon: 'list-outline' }
                ].map((step, index, arr) => {
                  const isActive = wizardStep === step.id;
                  const isPast = wizardStep > step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isPast ? '#0F172A' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={step.icon} size={14} color={isActive || isPast ? '#FFFFFF' : '#64748B'} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive || isPast ? '#0F172A' : '#64748B' }}>{step.label}</Text>
                      </View>
                      {index < arr.length - 1 && (
                        <View style={{ flex: 1, height: 2, backgroundColor: wizardStep > step.id ? '#0F172A' : '#E2E8F0', marginHorizontal: 4 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {wizardStep === 1 && (
                <View style={{ flex: 1 }}>
                  <View style={[styles.modalInputGroup, { zIndex: 30 }]}>
                    <Text style={styles.modalLabel}>Client (Optional)</Text>
                    <SearchableDropdown
                      data={clients}
                      value={formClientId}
                      onChange={setFormClientId}
                      placeholder="-- Select Client (Optional) --"
                      searchPlaceholder="Search Client..."
                      displayKey="client_name"
                      valueKey="id"
                    />
                  </View>

                  <View style={[styles.modalInputGroup, { zIndex: 20 }]}>
                    <Text style={styles.modalLabel}>Country *</Text>
                    <SearchableDropdown
                      data={countries}
                      value={formCountryId}
                      onChange={setFormCountryId}
                      placeholder="-- Select Country --"
                      searchPlaceholder="Search Country..."
                      displayKey="name"
                      valueKey="id"
                    />
                  </View>

                  <View style={[styles.modalInputGroup, { zIndex: 10 }]}>
                    <Text style={styles.modalLabel}>Module *</Text>
                    <SearchableDropdown
                      data={modules}
                      value={formModuleId}
                      onChange={setFormModuleId}
                      placeholder="-- Select Module --"
                      searchPlaceholder="Search Module..."
                      displayKey="module_name"
                      valueKey="id"
                    />
                  </View>
                </View>
              )}

              {wizardStep === 2 && (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', flex: 1, gap: 24 }}>
                    {/* Left Sidebar for Sections */}
                    <View style={{ width: isLargeScreen ? 250 : '100%', borderRightWidth: isLargeScreen ? 1 : 0, borderBottomWidth: isLargeScreen ? 0 : 1, borderRightColor: '#E2E8F0', borderBottomColor: '#E2E8F0', paddingRight: isLargeScreen ? 16 : 0, paddingBottom: isLargeScreen ? 0 : 16, maxHeight: isLargeScreen ? 'none' : 200 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase' }}>Sections</Text>
                      <ScrollView style={{ flex: 1, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                        {sections.map((section, sIndex) => (
                          <TouchableOpacity
                            key={section.id}
                            style={{ padding: 12, borderRadius: 8, backgroundColor: activeSectionId === section.id ? '#F1F5F9' : 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
                            onPress={() => setActiveSectionId(section.id)}
                          >
                            <Text style={{ fontSize: 14, fontWeight: activeSectionId === section.id ? '700' : '500', color: activeSectionId === section.id ? COLORS.primary : '#475569', flex: 1 }} numberOfLines={1}>
                              {section.name || `Section ${sIndex + 1}`}
                            </Text>
                            {sections.length > 1 && (
                              <TouchableOpacity onPress={() => removeSection(section.id)} style={{ padding: 4 }}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, borderRadius: 8, backgroundColor: '#F0F9FF' }}
                        onPress={addSection}
                      >
                        <Ionicons name="add" size={18} color={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>Add Section</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Right Content Area for Active Section Fields */}
                    <View style={{ flex: 2 }}>
                      {activeSectionId ? (() => {
                        const activeSection = sections.find(s => s.id === activeSectionId);
                        if (!activeSection) return null;

                        return (
                          <ScrollView nestedScrollEnabled={true} style={{ flex: 1, paddingRight: 8 }} showsVerticalScrollIndicator={false}>
                            <View style={styles.modalInputGroup}>
                              <Text style={styles.modalLabel}>Section Name *</Text>
                              <TextInput
                                style={styles.searchBarInputInline}
                                placeholder="e.g. Employee Details"
                                placeholderTextColor={COLORS.textMuted}
                                value={activeSection.name}
                                onChangeText={(val) => updateSectionName(activeSection.id, val)}
                              />
                            </View>

                            <View style={{ marginTop: 8 }}>
                              <Text style={[styles.modalLabel, { color: COLORS.primary }]}>Fields</Text>
                              {activeSection.fields.length === 0 && (
                                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 12, fontStyle: 'italic' }}>No fields added to this section yet.</Text>
                              )}

                              {activeSection.fields.map((field, fIndex) => (
                                <View key={field.id} style={{ zIndex: 1000 - fIndex, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>

                                  {/* Left: Flexible Inputs */}
                                  <View style={{ flexDirection: 'row', flex: 1, minWidth: 240, gap: 8, zIndex: 10, position: 'relative' }}>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                      <TextInput
                                        style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 0, height: 38, fontSize: 12, paddingHorizontal: 12 }]}
                                        placeholder="Field Name"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={field.name}
                                        onChangeText={(val) => updateField(activeSection.id, field.id, 'name', val)}
                                      />
                                    </View>
                                    <View style={{ flex: 1.3, minWidth: 160, zIndex: 10, position: 'relative' }}>
                                      <View style={[styles.dropdownSelector, { backgroundColor: '#FFFFFF', paddingVertical: 0, height: 38 }]}>
                                        <CustomDropdown selectedValue={field.type} onValueChange={(val) => updateField(activeSection.id, field.id, 'type', val)} options={FIELD_OPTIONS} />
                                      </View>
                                    </View>
                                  </View>

                                  {/* Right: Fixed Action Controls */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Req</Text>
                                      <Switch
                                        value={field.isRequired || false}
                                        onValueChange={(val) => updateField(activeSection.id, field.id, 'isRequired', val)}
                                        trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                      />
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Act</Text>
                                      <Switch
                                        value={field.isActive !== false}
                                        onValueChange={(val) => updateField(activeSection.id, field.id, 'isActive', val)}
                                        trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                      />
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 100 }}>
                                      <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Sort</Text>
                                      <TextInput
                                        style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', flex: 1, paddingVertical: 0, height: 38, textAlign: 'center', fontSize: 12, paddingHorizontal: 4, minWidth: 0 }]}
                                        placeholder="0"
                                        value={field.sort?.toString() || '0'}
                                        onChangeText={(val) => updateField(activeSection.id, field.id, 'sort', val)}
                                        keyboardType="numeric"
                                      />
                                    </View>
                                    <TouchableOpacity onPress={() => setActiveSubsectionModal({ sectionId: activeSection.id, fieldId: field.id })} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#E0F2FE', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Ionicons name="layers-outline" size={14} color="#0284C7" />
                                      <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }}>{(field.subsections || []).length > 0 ? `Subsections (${field.subsections.length})` : 'Add Subsection'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeFieldFromSection(activeSection.id, field.id)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                                      <Ionicons name="close" size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>



                                  {(['Dropdown', 'Searchable Dropdown', 'Radio Button', 'Checkbox'].includes(field.type)) && (
                                    <View style={{ width: '100%', marginTop: 8, paddingLeft: 4 }}>
                                      {/* Source Type Selector */}
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                                        <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>Option Source:</Text>
                                        <TouchableOpacity 
                                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                          onPress={() => updateField(activeSection.id, field.id, 'optionSource', 'static')}
                                        >
                                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                                            {(field.optionSource !== 'dynamic') && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />}
                                          </View>
                                          <Text style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' }}>Static Options</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                          onPress={() => updateField(activeSection.id, field.id, 'optionSource', 'dynamic')}
                                        >
                                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                                            {(field.optionSource === 'dynamic') && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />}
                                          </View>
                                          <Text style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' }}>Dynamic Link</Text>
                                        </TouchableOpacity>
                                      </View>

                                      {(field.optionSource === 'dynamic') ? (
                                        <View style={{ marginTop: 4, marginBottom: 8 }}>
                                          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>API Path / URL *</Text>
                                          <TextInput
                                            style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 8, fontSize: 12 }]}
                                            placeholder="e.g. /api/clients or http://localhost:5000/api/countries"
                                            placeholderTextColor={COLORS.textMuted}
                                            value={field.dynamicPath || ''}
                                            onChangeText={(val) => updateField(activeSection.id, field.id, 'dynamicPath', val)}
                                          />
                                        </View>
                                      ) : (
                                        <>
                                          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>Options</Text>
                                          {(field.optionsArr || []).map((opt, optIndex) => (
                                            <View key={`opt-${field.id}-${optIndex}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                                              <TextInput
                                                style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 6, fontSize: 12 }]}
                                                placeholder={`Option ${optIndex + 1}`}
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
                                        </>
                                      )}
                                    </View>
                                  )}

                                  {(['File Upload', 'Image Upload'].includes(field.type)) && (
                                    <View style={{ width: '100%', marginTop: 4, paddingLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' }}>Allow Multiple Uploads?</Text>
                                      <Switch
                                        value={field.allowMultiple || false}
                                        onValueChange={(val) => updateField(activeSection.id, field.id, 'allowMultiple', val)}
                                        trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                      />
                                    </View>
                                  )}



                                </View>
                              ))}

                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 8 }}
                                onPress={() => addFieldToSection(activeSection.id)}
                              >
                                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                                <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>Add Field</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={[styles.modalInputGroup, { marginTop: 32 }]}>
                              <Text style={styles.modalLabel}>Global Status</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                <Switch
                                  value={formStatus === 'Active'}
                                  onValueChange={(val) => setFormStatus(val ? 'Active' : 'Inactive')}
                                  trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                />
                                <Text style={{ fontSize: 14, color: formStatus === 'Active' ? COLORS.primary : COLORS.textSecondary, fontWeight: '500' }}>
                                  {formStatus === 'Active' ? 'Active' : 'Inactive'}
                                </Text>
                              </View>
                            </View>
                          </ScrollView>
                        );
                      })() : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="documents-outline" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                          <Text style={{ color: '#64748B', fontSize: 14 }}>Select or create a section to edit fields.</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.modalFooter, { justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: SPACING.md, zIndex: 1 }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }]}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: '#64748B' }]}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                {wizardStep > 1 && (
                  <TouchableOpacity
                    style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', justifyContent: 'center' }}
                    onPress={() => setWizardStep(s => s - 1)}
                  >
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 14 }}>Previous</Text>
                  </TouchableOpacity>
                )}

                {wizardStep < 2 ? (
                  <TouchableOpacity
                    style={{ backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' }}
                    onPress={() => setWizardStep(s => s + 1)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Next Step</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Complete & Save'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUBSECTION MODAL */}
      <Modal visible={!!activeSubsectionModal} transparent animationType="slide">
        <View style={[{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 10000 }, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 850, maxHeight: '90%', display: 'flex', flexDirection: 'column', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="layers-outline" size={22} color="#334155" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Manage Subsections</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveSubsectionModal(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 24 }}>
              {(() => {
                if (!activeSubsectionModal) return null;
                const { sectionId, fieldId } = activeSubsectionModal;
                const section = sections.find(s => s.id === sectionId);
                if (!section) return null;
                const field = section.fields.find(f => f.id === fieldId);
                if (!field) return null;

                return (
                  <View style={{ width: '100%' }}>
                    {(field.subsections || []).length === 0 && (
                      <View style={{ padding: 60, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginBottom: 16 }}>
                        <Ionicons name="folder-open-outline" size={36} color="#94A3B8" style={{ marginBottom: 16 }} />
                        <Text style={{ color: '#475569', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>No subsections added yet.</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 13 }}>Click the button below to create one.</Text>
                      </View>
                    )}

                    {(field.subsections || []).map((sub, subIndex) => (
                      <View key={sub.id} style={{ zIndex: 100 - subIndex, marginBottom: 24, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ gap: 8, marginBottom: 20 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TextInput
                              style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 10, fontSize: 14, borderColor: '#CBD5E1' }]}
                              placeholder="Subsection Name (e.g. Finance / Lease Details)"
                              placeholderTextColor={COLORS.textMuted}
                              value={sub.name}
                              onChangeText={(val) => updateSubsectionNameInField(sectionId, fieldId, sub.id, val)}
                            />
                            <TouchableOpacity onPress={() => removeSubsectionFromField(sectionId, fieldId, sub.id)} style={{ padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 10, fontSize: 14, borderColor: '#CBD5E1' }]}
                            placeholder="Trigger Option Value (e.g. Bank Finance) - blank to always show"
                            placeholderTextColor={COLORS.textMuted}
                            value={sub.triggerValue || ''}
                            onChangeText={(val) => updateSubsectionTriggerValueInField(sectionId, fieldId, sub.id, val)}
                          />
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A4D3E', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>FIELDS</Text>

                        {(sub.fields || []).map((sf, sfIndex) => (
                          <View key={sf.id} style={{ zIndex: 50 - sfIndex, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <View style={{ flexDirection: 'row', flex: 1, minWidth: 240, gap: 8, zIndex: 10, position: 'relative' }}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <TextInput
                                  style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 0, height: 38, fontSize: 12, paddingHorizontal: 12 }]}
                                  placeholder="Field Name"
                                  placeholderTextColor={COLORS.textMuted}
                                  value={sf.name}
                                  onChangeText={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'name', val)}
                                />
                              </View>
                              <View style={{ flex: 1.3, minWidth: 160, zIndex: 10, position: 'relative' }}>
                                <View style={[styles.dropdownSelector, { backgroundColor: '#FFFFFF', paddingVertical: 0, height: 38 }]}>
                                  <CustomDropdown selectedValue={sf.type} onValueChange={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'type', val)} options={FIELD_OPTIONS} />
                                </View>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 4 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Req</Text>
                                <Switch
                                  value={sf.isRequired || false}
                                  onValueChange={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'isRequired', val)}
                                  trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Act</Text>
                                <Switch
                                  value={sf.isActive !== false}
                                  onValueChange={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'isActive', val)}
                                  trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 100 }}>
                                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Sort</Text>
                                <TextInput
                                  style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', flex: 1, paddingVertical: 0, height: 38, textAlign: 'center', fontSize: 12, paddingHorizontal: 4, minWidth: 0 }]}
                                  placeholder="0"
                                  value={sf.sort?.toString() || '0'}
                                  onChangeText={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'sort', val)}
                                  keyboardType="numeric"
                                />
                              </View>
                              <TouchableOpacity onPress={() => removeFieldFromSubsectionInField(sectionId, fieldId, sub.id, sf.id)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                                <Ionicons name="close" size={14} color="#EF4444" />
                              </TouchableOpacity>
                            </View>



                            {(['Dropdown', 'Searchable Dropdown', 'Radio Button', 'Checkbox'].includes(sf.type)) && (
                              <View style={{ width: '100%', marginTop: 8, paddingLeft: 4 }}>
                                {/* Source Type Selector */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                                  <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>Option Source:</Text>
                                  <TouchableOpacity 
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    onPress={() => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'optionSource', 'static')}
                                  >
                                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                                      {(sf.optionSource !== 'dynamic') && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />}
                                    </View>
                                    <Text style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' }}>Static Options</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    onPress={() => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'optionSource', 'dynamic')}
                                  >
                                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                                      {(sf.optionSource === 'dynamic') && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />}
                                    </View>
                                    <Text style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' }}>Dynamic Link</Text>
                                  </TouchableOpacity>
                                </View>

                                {(sf.optionSource === 'dynamic') ? (
                                  <View style={{ marginTop: 4, marginBottom: 8 }}>
                                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>API Path / URL *</Text>
                                    <TextInput
                                      style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 8, fontSize: 12 }]}
                                      placeholder="e.g. /api/clients or http://localhost:5000/api/countries"
                                      placeholderTextColor={COLORS.textMuted}
                                      value={sf.dynamicPath || ''}
                                      onChangeText={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'dynamicPath', val)}
                                    />
                                  </View>
                                ) : (
                                  <>
                                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>Options</Text>
                                    {(sf.optionsArr || []).map((opt, optIndex) => (
                                      <View key={`opt-${sf.id}-${optIndex}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                                        <TextInput
                                          style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 6, fontSize: 12 }]}
                                          placeholder={`Option ${optIndex + 1}`}
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
                                  </>
                                )}
                              </View>
                            )}

                            {(['File Upload', 'Image Upload'].includes(sf.type)) && (
                              <View style={{ width: '100%', marginTop: 4, paddingLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' }}>Allow Multiple Uploads?</Text>
                                <Switch
                                  value={sf.allowMultiple || false}
                                  onValueChange={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'allowMultiple', val)}
                                  trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                              </View>
                            )}
                          </View>
                        ))}

                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 8 }}
                          onPress={() => addFieldToSubsectionInField(sectionId, fieldId, sub.id)}
                        >
                          <Ionicons name="add-circle-outline" size={18} color="#1A4D3E" />
                          <Text style={{ color: '#1A4D3E', fontWeight: '600', fontSize: 13 }}>Add Field</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#0284C7', borderRadius: 8, backgroundColor: '#E0F2FE' }}
                      onPress={() => addSubsectionToField(sectionId, fieldId)}
                    >
                      <Ionicons name="add" size={18} color="#0284C7" />
                      <Text style={{ color: '#0284C7', fontWeight: '700', fontSize: 14 }}>Create New Subsection</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'flex-end', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#1A4D3E', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
                onPress={() => setActiveSubsectionModal(null)}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: SPACING.xl,
  },
  modulesHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  modulesTitleWrapper: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  tabHeadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  tabHeadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  addModuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  addModuleBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableLoaderContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  loaderText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  modulesTableWrapper: {
    width: '100%',
  },
  modulesTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  modulesTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tdCell: {
    fontSize: 13,
    color: '#334155',
  },
  statusBadge: {
    alignSelf: 'center',
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 1100,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xl,
  },
  modalTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  modalCloseBtn: {
    padding: 2,
  },
  modalForm: {
    marginBottom: SPACING.lg,
    zIndex: 50,
  },
  modalInputGroup: {
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    backgroundColor: '#FAFAFA',
    height: 44,
  },
  searchBarInputInline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
    outlineWidth: 0,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: SPACING.md,
  },
  modalCancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
