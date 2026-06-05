const fs = require('fs');
const file = 'src/components/DashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variables
const stateVars = `
  // Company state variables
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companiesSearch, setCompaniesSearch] = useState('');
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyShortCode, setCompanyShortCode] = useState('');
  const [companyClientId, setCompanyClientId] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companyStatus, setCompanyStatus] = useState('Active');
`;
content = content.replace('// Client state variables', stateVars + '\n  // Client state variables');

// 2. Add fetch logic
const fetchLogic = `
  const fetchCompanies = () => {
    setCompaniesLoading(true);
    fetch(API_URL + '/api/companies')
      .then(res => res.json())
      .then(data => {
        setCompanies(Array.isArray(data) ? data : []);
        setCompaniesLoading(false);
      })
      .catch(err => {
        console.error('Error fetching companies:', err);
        setCompaniesLoading(false);
      });
  };
`;
content = content.replace('const fetchClients = () => {', fetchLogic + '\n  const fetchClients = () => {');

// 3. Add fetch call inside useEffect
content = content.replace('fetchClients();', 'fetchClients();\n    fetchCompanies();');

// 4. Add CRUD handlers
const crudHandlers = `
  const startEditCompany = (item) => {
    setEditingCompany(item);
    setCompanyNameInput(item.company_name || '');
    setCompanyShortCode(item.short_code || '');
    setCompanyClientId(item.clientid ? String(item.clientid) : '');
    setCompanyIndustry(item.industry || '');
    setCompanyStatus(item.company_status || 'Active');
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = () => {
    if (!companyNameInput.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }
    const payload = {
      company_name: companyNameInput,
      short_code: companyShortCode,
      clientid: companyClientId ? parseInt(companyClientId) : null,
      industry: companyIndustry,
      company_status: companyStatus,
    };
    const url = editingCompany ? API_URL + '/api/companies/' + editingCompany.id : API_URL + '/api/companies';
    const method = editingCompany ? 'PUT' : 'POST';
    
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to save company');
      showToast('Company ' + (editingCompany ? 'updated' : 'added') + ' successfully', 'success');
      setIsCompanyModalOpen(false);
      fetchCompanies();
    })
    .catch(err => {
      console.error(err);
      showToast('Error saving company', 'error');
    });
  };

  const handleDeleteCompany = (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      fetch(API_URL + '/api/companies/' + id, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete');
        showToast('Company deleted successfully', 'success');
        fetchCompanies();
      })
      .catch(err => showToast('Error deleting company', 'error'));
    }
  };
`;
content = content.replace('const startEditClient = (item) => {', crudHandlers + '\n  const startEditClient = (item) => {');

// 5. Add renderCompanyTab
const renderTab = `
  const renderCompanyTab = () => {
    const filtered = companies.filter(c => 
      c.company_name && c.company_name.toLowerCase().includes(companiesSearch.toLowerCase())
    );
    const displayPage = Math.min(companiesPage, Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
    const paginated = filtered.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECECFE', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="business-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Company Management</Text>
              <Text style={styles.tabHeadingSubtitle}>Manage internal and external company profiles.</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingCompany(null);
              setCompanyNameInput('');
              setCompanyShortCode('');
              setCompanyClientId('');
              setCompanyIndustry('');
              setCompanyStatus('Active');
              setIsCompanyModalOpen(true);
            }}
          >
            <Ionicons name="add" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
            <Text style={styles.addModuleBtnText}>Add Company</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(companiesSearch, setCompaniesSearch, setCompaniesPage, 'Search companies...')}

          {companiesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filtered.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}>
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 0.5 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2 }]}>COMPANY NAME</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>SHORT CODE</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>CLIENT</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>INDUSTRY</Text>
                    <Text style={[styles.thCell, { flex: 1 }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {paginated.map((item) => (
                    <View key={"company-"+item.id} style={styles.modulesTableRow}>
                      <Text style={[styles.tdCell, { flex: 0.5, color: COLORS.textMuted }]}>#{item.id}</Text>
                      <Text style={[styles.tdCell, { flex: 2, fontWeight: '500', color: COLORS.textPrimary }]}>{item.company_name}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.short_code || '-'}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.client_name || '-'}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.industry || '-'}</Text>
                      <View style={[styles.tdCell, { flex: 1, justifyContent: 'center' }]}>
                         <View style={[styles.statusBadge, getStatusStyle(item.company_status)]}>
                           <Text style={[styles.statusText, getStatusStyle(item.company_status)]}>{item.company_status}</Text>
                         </View>
                      </View>
                      <View style={[styles.tdCell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                        <TouchableOpacity onPress={() => startEditCompany(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="pencil" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteCompany(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
              {renderPagination(filtered.length, companiesPage, setCompaniesPage)}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateTitle}>No Companies Found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };
`;
content = content.replace('const renderClientTab = () => {', renderTab + '\n  const renderClientTab = () => {');

// 6. Switch routing
const routingLogic = `      case 'client':
        return renderClientTab();
      case 'company':
        return renderCompanyTab();`;
content = content.replace(`      case 'client':\n        return renderClientTab();`, routingLogic);

// 7. Company Modal
const companyModal = `
      {/* COMPANY MODAL */}
      <Modal
        visible={isCompanyModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCompanyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <MaterialCommunityIcons name={editingCompany ? "domain" : "domain-plus"} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingCompany ? 'Edit Company' : 'Add Company'}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCompanyModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexGrow: 0, maxHeight: height - 260 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <Text style={styles.modalLabel}>Company Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Acme Corp"
                  value={companyNameInput}
                  onChangeText={setCompanyNameInput}
                />
                
                <Text style={styles.modalLabel}>Short Code</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. ACME"
                  value={companyShortCode}
                  onChangeText={setCompanyShortCode}
                />

                <Text style={styles.modalLabel}>Client</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={companyClientId}
                    onValueChange={(itemValue) => setCompanyClientId(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="None (Internal)" value="" />
                    {clients.map(cl => (
                      <Picker.Item key={cl.id} label={cl.name} value={String(cl.id)} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.modalLabel}>Industry</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Technology"
                  value={companyIndustry}
                  onChangeText={setCompanyIndustry}
                />

                <Text style={styles.modalLabel}>Status</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={companyStatus}
                    onValueChange={(itemValue) => setCompanyStatus(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Active" value="Active" />
                    <Picker.Item label="Inactive" value="Inactive" />
                  </Picker>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCompanyModalOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveCompany}>
                <Text style={styles.modalSaveBtnText}>{editingCompany ? 'Update' : 'Save'} Company</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
`;

content = content.replace('{/* ADD CLIENT MODAL OVERLAY */}', companyModal + '\n      {/* ADD CLIENT MODAL OVERLAY */}');

fs.writeFileSync(file, content);
console.log('Injected Company logic successfully!');
