  const renderEmployeesTab = () => {
    const filtered = employees.filter(e => {
      const matchSearch = (e.full_name && e.full_name.toLowerCase().includes(employeesSearch.toLowerCase())) ||
        (e.email && e.email.toLowerCase().includes(employeesSearch.toLowerCase()));
      return matchSearch;
    });
    const displayPage = Math.min(employeesPage, Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
    const paginated = filtered.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECECFE', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Employees Management</Text>
              <Text style={styles.tabHeadingSubtitle}>Manage internal and external employees and users.</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingEmployee(null);
              setEmpFullName('');
              setEmpEmail('');
              setEmpPhone('');
              setEmpRoleId('');
              setEmpStatus(1);
              setEmpDepartmentId('');
              setEmpAssociatedCompanies([]);
              setEmpAutoGeneratePassword(false);
              setEmployeeFormError('');
              setIsEmployeeModalOpen(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.addModuleBtnText}>Create User</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search employees..."
            placeholderTextColor={COLORS.textSecondary}
            value={employeesSearch}
            onChangeText={(text) => {
              setEmployeesSearch(text);
              setEmployeesPage(1);
            }}
          />
        </View>

        <View style={styles.tableCard}>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
            <View style={styles.modulesTableWrapper}>
              {/* Table Header */}
              <View style={styles.modulesTableHeader}>
                <Text style={[styles.thCell, { flex: 2.0 }]}>Name</Text>
                <Text style={[styles.thCell, { flex: 2.0 }]}>Email</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>Role</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>Department</Text>
                <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>Status</Text>
                <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>Actions</Text>
              </View>

              {employeesLoading ? (
                <View style={styles.modulesLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.modulesLoadingText}>Loading Employees...</Text>
                </View>
              ) : paginated.length === 0 ? (
                <View style={styles.modulesEmptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.modulesEmptyText}>No employees found.</Text>
                </View>
              ) : (
                paginated.map((item, index) => (
                  <View key={item.id} style={[styles.modulesTableRow, index === paginated.length - 1 && styles.lastTableRow]}>
                    <Text style={[styles.tdCell, { flex: 2.0, fontWeight: '500', color: COLORS.textPrimary }]} numberOfLines={1}>
                      {item.full_name}
                    </Text>
                    <Text style={[styles.tdCell, { flex: 2.0 }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                    <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>
                      {item.role_name || '-'}
                    </Text>
                    <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>
                      {item.department_name || '-'}
                    </Text>
                    <View style={[styles.tdCell, { flex: 1.0, alignItems: 'center' }]}>
                      <View style={[styles.statusBadge, {
                        backgroundColor: item.status === 1 ? '#DCFCE7' : '#FEE2E2'
                      }]}>
                        <Text style={[styles.statusBadgeText, {
                          color: item.status === 1 ? '#16A34A' : '#DC2626'
                        }]}>
                          {item.status === 1 ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tdCell, { flex: 1.0, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                      <TouchableOpacity onPress={() => startEditEmployee(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteEmployee(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Pagination */}
          {!employeesLoading && filtered.length > ITEMS_PER_PAGE && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationBtn, employeesPage === 1 && styles.paginationBtnDisabled]}
                disabled={employeesPage === 1}
                onPress={() => setEmployeesPage(p => Math.max(1, p - 1))}
              >
                <Ionicons name="chevron-back" size={18} color={employeesPage === 1 ? '#94A3B8' : COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.paginationText}>
                Page {employeesPage} of {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              </Text>
              <TouchableOpacity
                style={[styles.paginationBtn, employeesPage === Math.ceil(filtered.length / ITEMS_PER_PAGE) && styles.paginationBtnDisabled]}
                disabled={employeesPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                onPress={() => setEmployeesPage(p => p + 1)}
              >
                <Ionicons name="chevron-forward" size={18} color={employeesPage === Math.ceil(filtered.length / ITEMS_PER_PAGE) ? '#94A3B8' : COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };
