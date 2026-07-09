import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, Picker, useWindowDimensions, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

const SearchableDropdown = ({ value, onChange, data, placeholder, searchPlaceholder, displayKey, valueKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = React.useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { height: windowHeight } = useWindowDimensions();

  const filteredData = data.filter(item =>
    item[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = data.find(item => item[valueKey] === value);

  const spaceBelow = windowHeight - (coords.y + coords.height);
  const useBottomAlignment = spaceBelow < 280;

  return (
    <View 
      ref={containerRef}
      style={{ position: 'relative', zIndex: isOpen ? 50 : 1, width: '100%' }}
    >
      <TouchableOpacity
        style={styles.dropdownSelector}
        onPress={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
              setCoords({ x: pageX, y: pageY, width, height });
              setIsOpen(true);
            });
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={{ color: selectedItem ? COLORS.textPrimary : COLORS.textMuted, fontSize: 14 }}>
          {selectedItem ? selectedItem[displayKey] : placeholder}
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
            ...(useBottomAlignment ? { bottom: 29 } : { top: coords.y + coords.height + 2 }),
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
                filteredData.map((item, index) => (
                  <TouchableOpacity
                    key={item[valueKey]}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: index === filteredData.length - 1 ? 0 : 1,
                      borderBottomColor: '#F1F5F9',
                      backgroundColor: value === item[valueKey] ? '#F8FAFC' : '#FFFFFF'
                    }}
                    onPress={() => {
                      onChange(item[valueKey]);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      color: value === item[valueKey] ? COLORS.primary : '#334155',
                      fontWeight: value === item[valueKey] ? '600' : '400'
                    }}>
                      {item[displayKey]}
                    </Text>
                  </TouchableOpacity>
                ))
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
  const containerRef = React.useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { height: windowHeight } = useWindowDimensions();
  const selectedLabel = options.find(o => o.value === selectedValue)?.label || 'Select...';

  const spaceBelow = windowHeight - (coords.y + coords.height);
  const useBottomAlignment = spaceBelow < 280;

  return (
    <View 
      ref={containerRef}
      style={{ flex: 1, zIndex: isOpen ? 9999 : 1, position: 'relative' }}
    >
      <TouchableOpacity
        style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        onPress={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
              setCoords({ x: pageX, y: pageY, width, height });
              setIsOpen(true);
            });
          }
        }}
        activeOpacity={0.8}
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
            onPress={() => setIsOpen(false)}
          />

          <View style={{
            position: 'absolute',
            ...(useBottomAlignment ? { bottom: 29 } : { top: coords.y + coords.height + 2 }),
            left: coords.x,
            width: coords.width,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            borderRadius: 6,
            maxHeight: 170,
            zIndex: 10000,
            shadowColor: '#000',
            shadowOffset: useBottomAlignment ? { width: 0, height: -4 } : { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
          }}>
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 170 }} keyboardShouldPersistTaps="handled">
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
        </Modal>
      )}
    </View>
  );
};

export default function FieldPermissionsTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [customFields, setCustomFields] = useState([]);
  const [fieldPermissions, setFieldPermissions] = useState([]);
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
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);
  const [activeSubsectionModal, setActiveSubsectionModal] = useState(null); // { sectionId, fieldId }
  const [selectedFields, setSelectedFields] = useState({}); // Track selected fields { fieldId: boolean }

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
        return { ...s, fields: [...s.fields, { id: Date.now().toString(), name: '', type: 'Textbox', isRequired: false, isActive: true, sort: '0' }] };
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
                    return { ...sub, fields: [...(sub.fields || []), { id: Date.now().toString(), name: '', type: 'Textbox', isRequired: false, isActive: true, sort: '0', optionsArr: [] }] };
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
      const [cfRes, fpRes, clientsRes, modulesRes, countriesRes] = await Promise.all([
        fetch(`${API_URL}/api/custom-fields`),
        fetch(`${API_URL}/api/field-permissions`),
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/countries`)
      ]);
      const cfData = await cfRes.json();
      const fpData = await fpRes.json();
      const clientsData = await clientsRes.json();
      const modulesData = await modulesRes.json();
      const countriesData = await countriesRes.json();

      setCustomFields(Array.isArray(cfData) ? cfData : []);
      setFieldPermissions(Array.isArray(fpData) ? fpData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setModules(Array.isArray(modulesData) ? modulesData : []);
      setCountries(Array.isArray(countriesData) ? countriesData : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading field permissions data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = fieldPermissions.filter(fp => {
    const term = search.toLowerCase();
    return (
      (fp.client_name && fp.client_name.toLowerCase().includes(term)) ||
      (fp.module_name && fp.module_name.toLowerCase().includes(term)) ||
      (fp.country_name && fp.country_name.toLowerCase().includes(term))
    );
  });

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredPermissions.length / ITEMS_PER_PAGE)));
  const paginatedPermissions = filteredPermissions.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleNextStep = async () => {
    if (wizardStep === 1) {
      if (!formClientId || !formModuleId || !formCountryId) {
        showToast('Client, Module and Country are required', 'error');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/field-permissions/config?clientid=${formClientId}&moduleid=${formModuleId}&countryid=${formCountryId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.permitted_fields) {
            let parsed = data.permitted_fields;
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch (e) { }
            }
            setSelectedFields(parsed || {});
          } else {
            setSelectedFields({});
          }
        }
      } catch (err) {
        console.error('Error fetching existing permissions', err);
      } finally {
        setLoading(false);
      }
      setWizardStep(2);
    } else {
      setWizardStep(s => s + 1);
    }
  };

  const handleSave = async () => {
    if (!formClientId || !formModuleId || !formCountryId) {
      showToast('Client, Module and Country are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { clientid: formClientId, moduleid: formModuleId, countryid: formCountryId, permitted_fields: selectedFields };
      const url = `${API_URL}/api/field-permissions`;
      const method = 'POST'; // createOrUpdateFieldPermission handles both

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
      showToast('Error saving field permission', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this field permission?')) return;
    try {
      const res = await fetch(`${API_URL}/api/field-permissions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Deleted successfully', 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Error deleting field permission', 'error');
    }
  };

  const openModal = (field = null) => {
    if (field) {
      setEditingId(field.id);
      setFormClientId(field.clientid);
      setFormModuleId(field.moduleid);
      setFormCountryId(field.country_id || field.countryid);
      setFormStatus(field.status || 'Active');

      let parsed = {};
      if (field.permitted_fields) {
        try {
          parsed = typeof field.permitted_fields === 'string' ? JSON.parse(field.permitted_fields) : field.permitted_fields;
        } catch (e) {
          console.error("Error parsing permitted_fields", e);
        }
      }
      setSelectedFields(parsed || {});
    } else {
      setEditingId(null);
      setFormClientId('');
      setFormModuleId('');
      setFormCountryId('');
      setFormStatus('Active');
      setSelectedFields({});
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
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Field Permissions</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage field permissions for clients and modules.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addModuleBtn}
          onPress={() => openModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color={COLORS.white} />
          <Text style={styles.addModuleBtnText}>Select Field Permission</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search field permissions by name...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Querying PostgreSQL field permissions...</Text>
          </View>
        ) : filteredPermissions.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>CLIENT NAME</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>COUNTRY NAME</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>MODULE NAME</Text>
                    <Text style={[styles.thCell, { flex: 2.0, textAlign: 'center' }]}>PERMITTED FIELDS</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>EDIT</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>ACTION</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedPermissions.map((item, index) => {
                    let activeFieldsCount = 0;
                    if (item.permitted_fields) {
                      let parsed = item.permitted_fields;
                      if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch (e) {}
                      }
                      activeFieldsCount = Object.values(parsed || {}).filter(v => v === true).length;
                    }

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedPermissions.length - 1 && styles.lastTableRow,
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

                        {/* Permitted Fields count */}
                        <Text style={[styles.tdCell, { flex: 2.0, textAlign: 'center', color: COLORS.textSecondary }]}>
                          {activeFieldsCount} fields active
                        </Text>

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
                </View>
              </View>
            </ScrollView>
            {renderTablePagination(filteredPermissions.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="shield-checkmark-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{fieldPermissions.length === 0 ? "No field permissions found." : "No matching field permissions found."}</Text>
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
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Field Permission</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { zIndex: 50, flex: 1 }]}>
              {/* Wizard Header Progress */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                {[
                  { id: 1, label: 'Configuration', icon: 'settings-outline' },
                  { id: 2, label: 'Field Access', icon: 'shield-checkmark-outline' }
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
                    <Text style={styles.modalLabel}>Client *</Text>
                    <SearchableDropdown
                      data={clients}
                      value={formClientId}
                      onChange={setFormClientId}
                      placeholder="-- Select Client --"
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

              {wizardStep === 2 && (() => {
                let targetCF = customFields.find(cf =>
                  String(cf.clientid) === String(formClientId) &&
                  String(cf.moduleid) === String(formModuleId) &&
                  String(cf.countryid || cf.country_id) === String(formCountryId)
                );

                if (!targetCF) {
                  targetCF = customFields.find(cf =>
                    (!cf.clientid && !cf.client_id) &&
                    String(cf.moduleid) === String(formModuleId) &&
                    String(cf.countryid || cf.country_id) === String(formCountryId)
                  );
                }
                if (!targetCF) {
                  targetCF = customFields.find(cf =>
                    String(cf.moduleid) === String(formModuleId) &&
                    String(cf.countryid || cf.country_id) === '1'
                  );
                }
                if (!targetCF) {
                  targetCF = customFields.find(cf =>
                    String(cf.moduleid) === String(formModuleId)
                  );
                }

                let parsedSections = [];
                if (targetCF && targetCF.field_data) {
                  try {
                    parsedSections = typeof targetCF.field_data === 'string' ? JSON.parse(targetCF.field_data) : targetCF.field_data;
                  } catch (e) {
                    console.error("Error parsing field_data", e);
                  }
                }

                if (parsedSections.length === 0) {
                  return (
                    <View style={{ flex: 1, paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ backgroundColor: '#FEF2F2', padding: 24, borderRadius: 100, marginBottom: 24 }}>
                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>No Custom Fields Found</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 450, lineHeight: 22 }}>
                        There are no custom fields declared for the selected Client, Country, and Module configuration. Please create the custom fields first before assigning permissions.
                      </Text>
                    </View>
                  );
                }

                return (
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>Configure Field Access</Text>
                    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 24 }} showsVerticalScrollIndicator={false}>
                      {parsedSections.map((section, sIdx) => (
                        <View key={`sec-${sIdx}`} style={{ marginBottom: 32 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#F1F5F9', paddingBottom: 8 }}>
                            {section.name || `Section ${sIdx + 1}`}
                          </Text>

                          {(section.fields || []).map((field, fIdx) => (
                            <View key={`field-${fIdx}`}>
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', justifyContent: 'space-between' }}
                                onPress={() => setSelectedFields(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                  <Ionicons name="document-text-outline" size={20} color="#64748B" />
                                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#334155' }}>{field.name}</Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: selectedFields[field.id] ? COLORS.primary : '#CBD5E1', backgroundColor: selectedFields[field.id] ? COLORS.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                    {selectedFields[field.id] && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                  </View>
                                </View>
                              </TouchableOpacity>

                              {/* Nested Subsections */}
                              {(field.subsections || []).length > 0 && (
                                <View style={{ marginLeft: 32, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', marginTop: 8, marginBottom: 16 }}>
                                  {(field.subsections || []).map((sub, subIdx) => (
                                    <View key={`sub-${subIdx}`} style={{ marginBottom: 12 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 }}>
                                        {sub.name || `Subsection ${subIdx + 1}`}
                                      </Text>

                                      {(sub.fields || []).map((sf, sfIdx) => (
                                        <TouchableOpacity
                                          key={`sfield-${sfIdx}`}
                                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', justifyContent: 'space-between' }}
                                          onPress={() => setSelectedFields(prev => ({ ...prev, [sf.id]: !prev[sf.id] }))}
                                          activeOpacity={0.7}
                                        >
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                            <Ionicons name="document-outline" size={18} color="#94A3B8" />
                                            <Text style={{ fontSize: 14, fontWeight: '500', color: '#475569' }}>{sf.name}</Text>
                                          </View>

                                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: selectedFields[sf.id] ? COLORS.primary : '#CBD5E1', backgroundColor: selectedFields[sf.id] ? COLORS.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                              {selectedFields[sf.id] && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                            </View>
                                          </View>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}
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
                    onPress={handleNextStep}
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
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 10000 }}>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                          <TextInput
                            style={[styles.searchBarInputInline, { flex: 1, marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 10, fontSize: 14, borderColor: '#CBD5E1' }]}
                            placeholder="Subsection Name (e.g. Health Details)"
                            placeholderTextColor={COLORS.textMuted}
                            value={sub.name}
                            onChangeText={(val) => updateSubsectionNameInField(sectionId, fieldId, sub.id, val)}
                          />
                          <TouchableOpacity onPress={() => removeSubsectionFromField(sectionId, fieldId, sub.id)} style={{ padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6 }}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A4D3E', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>FIELDS</Text>

                        {(sub.fields || []).map((sf, sfIndex) => (
                          <View key={sf.id} style={{ zIndex: 50 - sfIndex, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <View style={{ flexDirection: 'row', flex: 1, minWidth: 240, gap: 8 }}>
                              <View style={{ flex: 1.5, minWidth: 0 }}>
                                <TextInput
                                  style={[styles.searchBarInputInline, { marginBottom: 0, backgroundColor: '#FFFFFF', paddingVertical: 0, height: 38, fontSize: 12, paddingHorizontal: 12 }]}
                                  placeholder="Field Name"
                                  placeholderTextColor={COLORS.textMuted}
                                  value={sf.name}
                                  onChangeText={(val) => updateSubsectionFieldInField(sectionId, fieldId, sub.id, sf.id, 'name', val)}
                                />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
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
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 }}>
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
