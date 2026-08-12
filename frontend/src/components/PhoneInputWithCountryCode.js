import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

// Comprehensive default country dial code list with flags
const DEFAULT_COUNTRIES = [
  { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', dial_code: '+966', flag: '🇸🇦' },
  { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸' },
  { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳' },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧' },
  { name: 'Antigua and Barbuda', code: 'AG', dial_code: '+1', flag: '🇦🇬' },
  { name: 'Argentina', code: 'AR', dial_code: '+54', flag: '🇦🇷' },
  { name: 'Armenia', code: 'AM', dial_code: '+374', flag: '🇦🇲' },
  { name: 'Aruba', code: 'AW', dial_code: '+297', flag: '🇦🇼' },
  { name: 'Ascension Island', code: 'AC', dial_code: '+247', flag: '🇦🇨' },
  { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dial_code: '+43', flag: '🇦🇹' },
  { name: 'Bahrain', code: 'BH', dial_code: '+973', flag: '🇧🇭' },
  { name: 'Bangladesh', code: 'BD', dial_code: '+880', flag: '🇧🇩' },
  { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦' },
  { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳' },
  { name: 'Egypt', code: 'EG', dial_code: '+20', flag: '🇪🇬' },
  { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪' },
  { name: 'Italy', code: 'IT', dial_code: '+39', flag: '🇮🇹' },
  { name: 'Kuwait', code: 'KW', dial_code: '+965', flag: '🇰🇼' },
  { name: 'Oman', code: 'OM', dial_code: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', code: 'PK', dial_code: '+92', flag: '🇵🇰' },
  { name: 'Qatar', code: 'QA', dial_code: '+974', flag: '🇶🇦' },
  { name: 'Russia', code: 'RU', dial_code: '+7', flag: '🇷🇺' },
  { name: 'South Africa', code: 'ZA', dial_code: '+27', flag: '🇿🇦' },
  { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸' },
  { name: 'Turkey', code: 'TR', dial_code: '+90', flag: '🇹🇷' }
];

export default function PhoneInputWithCountryCode({
  value,
  onChangeText,
  placeholder = '560 1234',
  disabled = false,
  style
}) {
  const [countries, setCountries] = useState(DEFAULT_COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 280, height: 40 });
  const { height: windowHeight } = useWindowDimensions();

  // Fetch Outside API (REST Countries API) to populate full country list with flags & dialing codes
  useEffect(() => {
    let isMounted = true;
    const fetchOutsideCountriesApi = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag');
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            const formatted = apiData.map(c => {
              const root = c.idd?.root || '';
              const suffixes = c.idd?.suffixes || [];
              const suffix = suffixes.length === 1 ? suffixes[0] : '';
              const dialCode = root ? `${root}${suffix}` : '';
              return {
                name: c.name?.common || c.name?.official || '',
                code: c.cca2 || '',
                dial_code: dialCode,
                flag: c.flag || '🏳️'
              };
            }).filter(c => c.name && c.dial_code).sort((a, b) => a.name.localeCompare(b.name));

            if (isMounted && formatted.length > 0) {
              setCountries(formatted);
            }
          }
        }
      } catch (err) {
        // Fallback silently to default countries list if API fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOutsideCountriesApi();
    return () => { isMounted = false; };
  }, []);

  // Parse incoming value prop into country dial code + phone number body
  useEffect(() => {
    if (value) {
      const strVal = String(value).trim();
      const matchedCountry = countries.find(c => strVal.startsWith(c.dial_code));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        const rest = strVal.slice(matchedCountry.dial_code.length).trim();
        setPhoneNumber(rest);
      } else {
        setPhoneNumber(strVal);
      }
    } else {
      setPhoneNumber('');
    }
  }, [value, countries]);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm('');
    const fullVal = phoneNumber ? `${country.dial_code} ${phoneNumber}` : country.dial_code;
    if (onChangeText) onChangeText(fullVal);
  };

  const handleNumberChange = (num) => {
    setPhoneNumber(num);
    const fullVal = num ? `${selectedCountry.dial_code} ${num}` : '';
    if (onChangeText) onChangeText(fullVal);
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dial_code.includes(searchTerm) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={[styles.container, style]} ref={containerRef}>
      <View style={styles.inputRow}>
        {/* Country Picker Trigger Button */}
        <TouchableOpacity
          style={[styles.countryPickerBtn, disabled && styles.disabledPicker]}
          onPress={() => {
            if (disabled) return;
            if (containerRef.current?.measure) {
              containerRef.current.measure((x, y, width, height, pageX, pageY) => {
                setCoords({ x: pageX, y: pageY, width: Math.max(width, 280), height });
                setIsOpen(true);
              });
            } else {
              setIsOpen(true);
            }
          }}
          activeOpacity={disabled ? 1 : 0.8}
        >
          <Text style={styles.flagText}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCodeText}>{selectedCountry.dial_code}</Text>
          <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        {/* Number Input Field */}
        <TextInput
          style={[styles.numberInput, disabled && styles.disabledInput]}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={phoneNumber}
          onChangeText={handleNumberChange}
          keyboardType="phone-pad"
          editable={!disabled}
        />
      </View>

      {/* Country List Selection Modal */}
      {isOpen && (
        <Modal
          transparent={true}
          visible={isOpen}
          animationType="none"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          <View style={[
            styles.dropdownModal,
            {
              top: coords.y + coords.height + 4,
              left: coords.x,
              width: Math.min(coords.width, 320)
            }
          ]}>
            {/* Search Bar inside Modal */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoFocus={true}
              />
            </View>

            {/* Country List */}
            <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
              {loading ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Loading countries API...</Text>
                </View>
              ) : filteredCountries.length > 0 ? (
                filteredCountries.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.code}-${index}`}
                    style={[
                      styles.countryItem,
                      selectedCountry.code === item.code && styles.selectedCountryItem
                    ]}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <Text style={styles.flagTextModal}>{item.flag}</Text>
                    <Text style={styles.countryNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.countryDialCodeText}>
                      {item.dial_code}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>No country found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  countryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    gap: 4
  },
  disabledPicker: {
    backgroundColor: '#F1F5F9',
    opacity: 0.7
  },
  flagText: {
    fontSize: 16,
    marginRight: 2
  },
  dialCodeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  numberInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none'
  },
  disabledInput: {
    backgroundColor: '#F8FAFC',
    color: '#64748B'
  },
  dropdownModal: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10000,
    overflow: 'hidden'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC'
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    outlineStyle: 'none'
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  selectedCountryItem: {
    backgroundColor: '#F0F9FF'
  },
  flagTextModal: {
    fontSize: 16,
    marginRight: 10
  },
  countryNameText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500'
  },
  countryDialCodeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8
  }
});
