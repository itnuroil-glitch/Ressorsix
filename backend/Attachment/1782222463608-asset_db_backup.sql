--
-- PostgreSQL database dump
--

\restrict fAWa6F8Cbqb1iIGb6Qh62c1o326Wr1L0k0d3Dgu75cIamGeurO5EaqzcjZk6Ijf

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-05-01 15:01:04

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS software_db;
--
-- TOC entry 5569 (class 1262 OID 17102)
-- Name: software_db; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE software_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United Arab Emirates.1252';


ALTER DATABASE software_db OWNER TO postgres;

\unrestrict fAWa6F8Cbqb1iIGb6Qh62c1o326Wr1L0k0d3Dgu75cIamGeurO5EaqzcjZk6Ijf
\connect software_db
\restrict fAWa6F8Cbqb1iIGb6Qh62c1o326Wr1L0k0d3Dgu75cIamGeurO5EaqzcjZk6Ijf

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 20244)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5570 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 302 (class 1255 OID 22872)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 20246)
-- Name: area; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.area (
    id integer NOT NULL,
    name character varying(100)
);


ALTER TABLE public.area OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 20245)
-- Name: area_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.area_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.area_id_seq OWNER TO postgres;

--
-- TOC entry 5572 (class 0 OID 0)
-- Dependencies: 219
-- Name: area_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.area_id_seq OWNED BY public.area.id;


--
-- TOC entry 222 (class 1259 OID 20254)
-- Name: asset_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_assignments (
    id integer NOT NULL,
    company_id integer NOT NULL,
    asset_id integer NOT NULL,
    employee_id integer NOT NULL,
    assigned_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    returned_date timestamp without time zone,
    notes text
);


ALTER TABLE public.asset_assignments OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 20253)
-- Name: asset_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_assignments_id_seq OWNER TO postgres;

--
-- TOC entry 5573 (class 0 OID 0)
-- Dependencies: 221
-- Name: asset_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_assignments_id_seq OWNED BY public.asset_assignments.id;


--
-- TOC entry 224 (class 1259 OID 20269)
-- Name: asset_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_categories (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    parent_id integer
);


ALTER TABLE public.asset_categories OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 20268)
-- Name: asset_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_categories_id_seq OWNER TO postgres;

--
-- TOC entry 5574 (class 0 OID 0)
-- Dependencies: 223
-- Name: asset_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_categories_id_seq OWNED BY public.asset_categories.id;


--
-- TOC entry 226 (class 1259 OID 20281)
-- Name: asset_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_requests (
    id integer NOT NULL,
    company_id integer NOT NULL,
    employee_id integer NOT NULL,
    category_id integer,
    asset_id integer,
    reason text,
    status text DEFAULT 'SUBMITTED'::text,
    admin_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.asset_requests OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 20280)
-- Name: asset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_requests_id_seq OWNER TO postgres;

--
-- TOC entry 5575 (class 0 OID 0)
-- Dependencies: 225
-- Name: asset_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_requests_id_seq OWNED BY public.asset_requests.id;


--
-- TOC entry 228 (class 1259 OID 20298)
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    company_id integer NOT NULL,
    category_id integer,
    asset_code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    brand character varying(100),
    model character varying(100),
    serial_number character varying(100),
    purchase_date date,
    purchase_cost numeric,
    status text DEFAULT 'AVAILABLE'::text,
    current_holder_id integer,
    location character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sub_category character varying(100),
    image_data text,
    quantity integer DEFAULT 1
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 20297)
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assets_id_seq OWNER TO postgres;

--
-- TOC entry 5576 (class 0 OID 0)
-- Dependencies: 227
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- TOC entry 230 (class 1259 OID 20314)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    company_id integer,
    user_id integer,
    action character varying(255) NOT NULL,
    entity_type character varying(100),
    entity_id integer,
    details text,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 20313)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5577 (class 0 OID 0)
-- Dependencies: 229
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 283 (class 1259 OID 22874)
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    max_companies integer DEFAULT 5,
    max_employees integer DEFAULT 100,
    max_assets integer DEFAULT 500,
    enabled_modules jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_code character varying(50),
    trade_license character varying(100),
    tax_no character varying(100),
    industry character varying(100),
    logo character varying(255),
    tenancy_type character varying(20) DEFAULT 'OWNED'::character varying,
    landlord_name character varying(255),
    contract_start_date date,
    contract_end_date date,
    registration_no character varying(100),
    ownership_doc_ref character varying(100),
    country character varying(100),
    state character varying(100),
    city character varying(100),
    area character varying(255),
    address text,
    po_box character varying(50),
    makani_number character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    telephone character varying(50),
    email character varying(255),
    website character varying(255),
    support_email character varying(255),
    smtp_host text,
    smtp_port integer,
    smtp_user text,
    smtp_pass text,
    smtp_encryption text DEFAULT 'tls'::text,
    smtp_from_email text,
    smtp_from_name text,
    admin_role text DEFAULT 'COMPANY_ADMIN'::text
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 22873)
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- TOC entry 5578 (class 0 OID 0)
-- Dependencies: 282
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- TOC entry 232 (class 1259 OID 20327)
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    subdomain character varying(100),
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_id integer,
    can_add_employee boolean DEFAULT true,
    max_employees integer DEFAULT 10,
    max_assets integer DEFAULT 20,
    company_code character varying(50),
    trade_license character varying(100),
    tax_no character varying(100),
    industry character varying(100),
    logo text,
    tenancy_type character varying(20) DEFAULT 'OWNED'::character varying,
    landlord_name character varying(255),
    contract_start_date date,
    contract_end_date date,
    registration_no character varying(100),
    ownership_doc_ref character varying(100),
    country character varying(100),
    state character varying(100),
    city character varying(100),
    area character varying(100),
    address text,
    po_box character varying(50),
    makani_number character varying(100),
    telephone character varying(50),
    email character varying(255),
    website character varying(255),
    enabled_modules jsonb
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 20326)
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- TOC entry 5579 (class 0 OID 0)
-- Dependencies: 231
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- TOC entry 285 (class 1259 OID 22903)
-- Name: company_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_documents (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_documents OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 22902)
-- Name: company_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_documents_id_seq OWNER TO postgres;

--
-- TOC entry 5580 (class 0 OID 0)
-- Dependencies: 284
-- Name: company_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_documents_id_seq OWNED BY public.company_documents.id;


--
-- TOC entry 234 (class 1259 OID 20343)
-- Name: company_module_field_selection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_module_field_selection (
    id integer NOT NULL,
    company_module_id integer NOT NULL,
    field_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.company_module_field_selection OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 20342)
-- Name: company_module_field_selection_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_module_field_selection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_module_field_selection_id_seq OWNER TO postgres;

--
-- TOC entry 5581 (class 0 OID 0)
-- Dependencies: 233
-- Name: company_module_field_selection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_module_field_selection_id_seq OWNED BY public.company_module_field_selection.id;


--
-- TOC entry 236 (class 1259 OID 20355)
-- Name: company_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_modules (
    id integer NOT NULL,
    company_id integer NOT NULL,
    module_id integer NOT NULL,
    is_enabled integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    country_id integer,
    property_type_id integer,
    premises_type_id integer,
    area_id integer,
    status_id integer DEFAULT 1,
    region character varying(255),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    vehicle_usage_id integer,
    vehicle_category_id integer
);


ALTER TABLE public.company_modules OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 20354)
-- Name: company_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_modules_id_seq OWNER TO postgres;

--
-- TOC entry 5582 (class 0 OID 0)
-- Dependencies: 235
-- Name: company_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_modules_id_seq OWNED BY public.company_modules.id;


--
-- TOC entry 238 (class 1259 OID 20369)
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    country_name character varying(100) NOT NULL
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 20368)
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.countries_id_seq OWNER TO postgres;

--
-- TOC entry 5583 (class 0 OID 0)
-- Dependencies: 237
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- TOC entry 240 (class 1259 OID 20378)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50)
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 20377)
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- TOC entry 5584 (class 0 OID 0)
-- Dependencies: 239
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- TOC entry 242 (class 1259 OID 20388)
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    company_id integer NOT NULL,
    department_id integer,
    employee_id_card character varying(50),
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    "position" character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 20387)
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- TOC entry 5585 (class 0 OID 0)
-- Dependencies: 241
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- TOC entry 244 (class 1259 OID 20400)
-- Name: maintenance_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_tickets (
    id integer NOT NULL,
    company_id integer NOT NULL,
    asset_id integer NOT NULL,
    issue_description text NOT NULL,
    status text DEFAULT 'OPEN'::text,
    priority text DEFAULT 'MEDIUM'::text,
    cost numeric DEFAULT 0.00,
    scheduled_date date,
    completion_date date,
    performed_by character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.maintenance_tickets OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 20399)
-- Name: maintenance_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_tickets_id_seq OWNER TO postgres;

--
-- TOC entry 5586 (class 0 OID 0)
-- Dependencies: 243
-- Name: maintenance_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_tickets_id_seq OWNED BY public.maintenance_tickets.id;


--
-- TOC entry 246 (class 1259 OID 20418)
-- Name: module_heads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_heads (
    id integer NOT NULL,
    template_id integer NOT NULL,
    head_title character varying(255) NOT NULL,
    head_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.module_heads OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 20417)
-- Name: module_heads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_heads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_heads_id_seq OWNER TO postgres;

--
-- TOC entry 5587 (class 0 OID 0)
-- Dependencies: 245
-- Name: module_heads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_heads_id_seq OWNED BY public.module_heads.id;


--
-- TOC entry 248 (class 1259 OID 20433)
-- Name: module_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_master (
    module_id integer NOT NULL,
    module_name character varying(255) NOT NULL,
    is_active integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    parent_id integer
);


ALTER TABLE public.module_master OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 20432)
-- Name: module_master_module_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_master_module_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_master_module_id_seq OWNER TO postgres;

--
-- TOC entry 5588 (class 0 OID 0)
-- Dependencies: 247
-- Name: module_master_module_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_master_module_id_seq OWNED BY public.module_master.module_id;


--
-- TOC entry 250 (class 1259 OID 20445)
-- Name: module_section_field_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_section_field_options (
    id integer NOT NULL,
    field_id integer NOT NULL,
    option_label character varying(255) NOT NULL,
    option_value character varying(255) NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.module_section_field_options OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 20444)
-- Name: module_section_field_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_section_field_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_section_field_options_id_seq OWNER TO postgres;

--
-- TOC entry 5589 (class 0 OID 0)
-- Dependencies: 249
-- Name: module_section_field_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_section_field_options_id_seq OWNED BY public.module_section_field_options.id;


--
-- TOC entry 252 (class 1259 OID 20461)
-- Name: module_section_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_section_fields (
    id integer NOT NULL,
    company_id integer NOT NULL,
    module_id integer NOT NULL,
    section_id integer NOT NULL,
    field_key character varying(100) NOT NULL,
    label character varying(255) NOT NULL,
    field_type character varying(50) NOT NULL,
    placeholder character varying(255),
    is_required integer DEFAULT 0,
    is_active integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta_json jsonb,
    visibility_rule jsonb
);


ALTER TABLE public.module_section_fields OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 20460)
-- Name: module_section_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_section_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_section_fields_id_seq OWNER TO postgres;

--
-- TOC entry 5590 (class 0 OID 0)
-- Dependencies: 251
-- Name: module_section_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_section_fields_id_seq OWNED BY public.module_section_fields.id;


--
-- TOC entry 254 (class 1259 OID 20484)
-- Name: module_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_sections (
    id integer NOT NULL,
    company_id integer NOT NULL,
    module_id integer NOT NULL,
    name character varying(255) NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    visibility_rule jsonb
);


ALTER TABLE public.module_sections OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 20483)
-- Name: module_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_sections_id_seq OWNER TO postgres;

--
-- TOC entry 5591 (class 0 OID 0)
-- Dependencies: 253
-- Name: module_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_sections_id_seq OWNED BY public.module_sections.id;


--
-- TOC entry 256 (class 1259 OID 20500)
-- Name: module_subhead_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_subhead_options (
    id integer NOT NULL,
    subhead_id integer NOT NULL,
    option_label character varying(255) NOT NULL,
    option_value character varying(255) NOT NULL,
    option_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.module_subhead_options OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 20499)
-- Name: module_subhead_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_subhead_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_subhead_options_id_seq OWNER TO postgres;

--
-- TOC entry 5592 (class 0 OID 0)
-- Dependencies: 255
-- Name: module_subhead_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_subhead_options_id_seq OWNED BY public.module_subhead_options.id;


--
-- TOC entry 258 (class 1259 OID 20518)
-- Name: module_subheads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_subheads (
    id integer NOT NULL,
    head_id integer NOT NULL,
    subhead_title character varying(255) NOT NULL,
    field_type date NOT NULL,
    placeholder character varying(255),
    is_required integer DEFAULT 0,
    subhead_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.module_subheads OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 20517)
-- Name: module_subheads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_subheads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_subheads_id_seq OWNER TO postgres;

--
-- TOC entry 5593 (class 0 OID 0)
-- Dependencies: 257
-- Name: module_subheads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_subheads_id_seq OWNED BY public.module_subheads.id;


--
-- TOC entry 260 (class 1259 OID 20537)
-- Name: module_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_templates (
    id integer NOT NULL,
    company_id integer NOT NULL,
    module_id integer NOT NULL,
    template_name character varying(255),
    description text,
    is_active integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.module_templates OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 20536)
-- Name: module_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_templates_id_seq OWNER TO postgres;

--
-- TOC entry 5594 (class 0 OID 0)
-- Dependencies: 259
-- Name: module_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_templates_id_seq OWNED BY public.module_templates.id;


--
-- TOC entry 262 (class 1259 OID 20554)
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules (
    id integer NOT NULL,
    company_id integer NOT NULL,
    module_key character varying(50),
    name character varying(255) NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.modules OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 20553)
-- Name: modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modules_id_seq OWNER TO postgres;

--
-- TOC entry 5595 (class 0 OID 0)
-- Dependencies: 261
-- Name: modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;


--
-- TOC entry 264 (class 1259 OID 20571)
-- Name: modules_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules_master (
    id integer NOT NULL,
    module_key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(100)
);


ALTER TABLE public.modules_master OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 20570)
-- Name: modules_master_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modules_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modules_master_id_seq OWNER TO postgres;

--
-- TOC entry 5596 (class 0 OID 0)
-- Dependencies: 263
-- Name: modules_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modules_master_id_seq OWNED BY public.modules_master.id;


--
-- TOC entry 265 (class 1259 OID 20582)
-- Name: office_owned_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_owned_details (
    premise_id integer NOT NULL,
    buy_date date NOT NULL,
    purchase_value numeric NOT NULL,
    property_size_sqft numeric,
    title_deed_ref character varying(100),
    owner_name character varying(120),
    renewal_required integer DEFAULT 0,
    renewal_date date,
    insurance_required integer DEFAULT 0,
    insurance_expiry date,
    notes text,
    floors_count integer DEFAULT 0,
    depreciation_rate numeric DEFAULT 0.00,
    electricity_available integer DEFAULT 0,
    water_available integer DEFAULT 0,
    internet_available integer DEFAULT 0,
    ownership_type character varying(50),
    vendor_name character varying(150),
    warranty_end_date date,
    property_tax_id character varying(80),
    depreciation_percent numeric
);


ALTER TABLE public.office_owned_details OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 20600)
-- Name: office_premise_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_premise_attachments (
    attachment_id integer NOT NULL,
    premise_id integer NOT NULL,
    company_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    mime_type character varying(100),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.office_premise_attachments OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 20599)
-- Name: office_premise_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.office_premise_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.office_premise_attachments_attachment_id_seq OWNER TO postgres;

--
-- TOC entry 5597 (class 0 OID 0)
-- Dependencies: 266
-- Name: office_premise_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.office_premise_attachments_attachment_id_seq OWNED BY public.office_premise_attachments.attachment_id;


--
-- TOC entry 269 (class 1259 OID 20616)
-- Name: office_premises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_premises (
    premise_id integer NOT NULL,
    company_id integer NOT NULL,
    premise_type text NOT NULL,
    premises_name character varying(255) NOT NULL,
    building_name character varying(255) NOT NULL,
    premises_use text NOT NULL,
    country character varying(100) NOT NULL,
    area_id integer,
    company_module_id integer,
    city character varying(100) NOT NULL,
    full_address text NOT NULL,
    location_notes text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    document_name character varying(255),
    document_path character varying(255),
    document_mime character varying(50),
    google_map_url text,
    capacity integer DEFAULT 0,
    address_line2 character varying(255),
    landmark character varying(255),
    address_line1 character varying(255),
    location_lat numeric,
    location_lng numeric,
    area_sqft numeric,
    floors integer,
    parking_available integer DEFAULT 0,
    parking_area character varying(255),
    region character varying(255)
);


ALTER TABLE public.office_premises OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 20641)
-- Name: office_premises_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_premises_documents (
    doc_id integer NOT NULL,
    company_id integer NOT NULL,
    premise_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    mime_type character varying(80) NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.office_premises_documents OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 20640)
-- Name: office_premises_documents_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.office_premises_documents_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.office_premises_documents_doc_id_seq OWNER TO postgres;

--
-- TOC entry 5598 (class 0 OID 0)
-- Dependencies: 270
-- Name: office_premises_documents_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.office_premises_documents_doc_id_seq OWNED BY public.office_premises_documents.doc_id;


--
-- TOC entry 268 (class 1259 OID 20615)
-- Name: office_premises_premise_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.office_premises_premise_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.office_premises_premise_id_seq OWNER TO postgres;

--
-- TOC entry 5599 (class 0 OID 0)
-- Dependencies: 268
-- Name: office_premises_premise_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.office_premises_premise_id_seq OWNED BY public.office_premises.premise_id;


--
-- TOC entry 272 (class 1259 OID 20657)
-- Name: office_premises_utilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_premises_utilities (
    premise_id integer NOT NULL,
    company_id integer NOT NULL,
    electricity_no character varying(80),
    water_no character varying(80),
    internet_provider character varying(120),
    utility_notes text
);


ALTER TABLE public.office_premises_utilities OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 20666)
-- Name: office_rental_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_rental_details (
    premise_id integer NOT NULL,
    landlord_name character varying(255) NOT NULL,
    landlord_contact_person character varying(120),
    landlord_phone character varying(50) NOT NULL,
    landlord_email character varying(120),
    contract_start date NOT NULL,
    contract_end date NOT NULL,
    monthly_rent numeric NOT NULL,
    security_deposit numeric,
    renewal_reminder_date date,
    payment_frequency text DEFAULT 'MONTHLY'::text,
    next_payment_date date,
    late_fee_terms character varying(255),
    notes text,
    yearly_rent numeric,
    deposit_amount numeric,
    next_due_date date,
    lease_start_date date,
    lease_end_date date,
    rent_amount numeric,
    payment_cycle character varying(50) DEFAULT 'MONTHLY'::character varying
);


ALTER TABLE public.office_rental_details OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 20682)
-- Name: premises_module_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.premises_module_details (
    id integer NOT NULL,
    premise_id integer NOT NULL,
    company_id integer NOT NULL,
    field_key character varying(255) NOT NULL,
    field_value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.premises_module_details OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 20681)
-- Name: premises_module_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.premises_module_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.premises_module_details_id_seq OWNER TO postgres;

--
-- TOC entry 5600 (class 0 OID 0)
-- Dependencies: 274
-- Name: premises_module_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.premises_module_details_id_seq OWNED BY public.premises_module_details.id;


--
-- TOC entry 277 (class 1259 OID 20699)
-- Name: premises_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.premises_types (
    id integer NOT NULL,
    type_name character varying(50) NOT NULL
);


ALTER TABLE public.premises_types OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 20698)
-- Name: premises_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.premises_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.premises_types_id_seq OWNER TO postgres;

--
-- TOC entry 5601 (class 0 OID 0)
-- Dependencies: 276
-- Name: premises_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.premises_types_id_seq OWNED BY public.premises_types.id;


--
-- TOC entry 279 (class 1259 OID 20708)
-- Name: property_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.property_types OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 20707)
-- Name: property_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_types_id_seq OWNER TO postgres;

--
-- TOC entry 5602 (class 0 OID 0)
-- Dependencies: 278
-- Name: property_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_types_id_seq OWNED BY public.property_types.id;


--
-- TOC entry 301 (class 1259 OID 74644)
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    region_name character varying(100) NOT NULL
);


ALTER TABLE public.regions OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 74643)
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regions_id_seq OWNER TO postgres;

--
-- TOC entry 5603 (class 0 OID 0)
-- Dependencies: 300
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- TOC entry 295 (class 1259 OID 32818)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    module_name character varying(100) NOT NULL,
    can_view boolean DEFAULT false,
    can_create boolean DEFAULT false,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    can_approve boolean DEFAULT false
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 32817)
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- TOC entry 5604 (class 0 OID 0)
-- Dependencies: 294
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- TOC entry 293 (class 1259 OID 32797)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    company_id integer,
    role_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 32796)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5605 (class 0 OID 0)
-- Dependencies: 292
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 291 (class 1259 OID 32774)
-- Name: smtp_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.smtp_configs (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    host character varying(255) NOT NULL,
    port integer DEFAULT 587 NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    encryption character varying(10) DEFAULT 'tls'::character varying,
    from_email character varying(255) NOT NULL,
    from_name character varying(255),
    reply_to character varying(255),
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    debug_mode boolean DEFAULT false,
    company_id integer,
    module_name character varying(255)
);


ALTER TABLE public.smtp_configs OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 32773)
-- Name: smtp_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.smtp_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.smtp_configs_id_seq OWNER TO postgres;

--
-- TOC entry 5606 (class 0 OID 0)
-- Dependencies: 290
-- Name: smtp_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.smtp_configs_id_seq OWNED BY public.smtp_configs.id;


--
-- TOC entry 299 (class 1259 OID 40988)
-- Name: status_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status_master (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.status_master OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 40987)
-- Name: status_master_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.status_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.status_master_id_seq OWNER TO postgres;

--
-- TOC entry 5607 (class 0 OID 0)
-- Dependencies: 298
-- Name: status_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.status_master_id_seq OWNED BY public.status_master.id;


--
-- TOC entry 281 (class 1259 OID 20717)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    company_id integer,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_id integer,
    force_reset boolean DEFAULT false,
    role_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 20716)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5608 (class 0 OID 0)
-- Dependencies: 280
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 289 (class 1259 OID 24632)
-- Name: vehicle_module_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_module_details (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    company_id integer NOT NULL,
    field_key character varying(255) NOT NULL,
    field_value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vehicle_module_details OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 24631)
-- Name: vehicle_module_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicle_module_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicle_module_details_id_seq OWNER TO postgres;

--
-- TOC entry 5609 (class 0 OID 0)
-- Dependencies: 288
-- Name: vehicle_module_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicle_module_details_id_seq OWNED BY public.vehicle_module_details.id;


--
-- TOC entry 297 (class 1259 OID 40965)
-- Name: vehicle_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_usage (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.vehicle_usage OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 40964)
-- Name: vehicle_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicle_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicle_usage_id_seq OWNER TO postgres;

--
-- TOC entry 5610 (class 0 OID 0)
-- Dependencies: 296
-- Name: vehicle_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicle_usage_id_seq OWNED BY public.vehicle_usage.id;


--
-- TOC entry 287 (class 1259 OID 24617)
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    vehicle_id integer NOT NULL,
    company_id integer NOT NULL,
    vehicle_name character varying(255) NOT NULL,
    license_plate character varying(50),
    type character varying(50),
    driver character varying(255),
    vehicle_usage character varying(255),
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    country_id integer,
    property_type_id integer,
    premises_type_id integer,
    area_id integer,
    image_path text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    region character varying(255),
    vehicle_usage_id integer
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 24616)
-- Name: vehicles_vehicle_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicles_vehicle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicles_vehicle_id_seq OWNER TO postgres;

--
-- TOC entry 5611 (class 0 OID 0)
-- Dependencies: 286
-- Name: vehicles_vehicle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicles_vehicle_id_seq OWNED BY public.vehicles.vehicle_id;


--
-- TOC entry 5017 (class 2604 OID 20249)
-- Name: area id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.area ALTER COLUMN id SET DEFAULT nextval('public.area_id_seq'::regclass);


--
-- TOC entry 5018 (class 2604 OID 20257)
-- Name: asset_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_assignments ALTER COLUMN id SET DEFAULT nextval('public.asset_assignments_id_seq'::regclass);


--
-- TOC entry 5020 (class 2604 OID 20272)
-- Name: asset_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories ALTER COLUMN id SET DEFAULT nextval('public.asset_categories_id_seq'::regclass);


--
-- TOC entry 5021 (class 2604 OID 20284)
-- Name: asset_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_requests ALTER COLUMN id SET DEFAULT nextval('public.asset_requests_id_seq'::regclass);


--
-- TOC entry 5025 (class 2604 OID 20301)
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- TOC entry 5029 (class 2604 OID 20317)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 5122 (class 2604 OID 22877)
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- TOC entry 5031 (class 2604 OID 20330)
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- TOC entry 5133 (class 2604 OID 22906)
-- Name: company_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents ALTER COLUMN id SET DEFAULT nextval('public.company_documents_id_seq'::regclass);


--
-- TOC entry 5039 (class 2604 OID 20346)
-- Name: company_module_field_selection id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_module_field_selection ALTER COLUMN id SET DEFAULT nextval('public.company_module_field_selection_id_seq'::regclass);


--
-- TOC entry 5041 (class 2604 OID 20358)
-- Name: company_modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules ALTER COLUMN id SET DEFAULT nextval('public.company_modules_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 20372)
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- TOC entry 5047 (class 2604 OID 20381)
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- TOC entry 5048 (class 2604 OID 20391)
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- TOC entry 5050 (class 2604 OID 20403)
-- Name: maintenance_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tickets ALTER COLUMN id SET DEFAULT nextval('public.maintenance_tickets_id_seq'::regclass);


--
-- TOC entry 5055 (class 2604 OID 20421)
-- Name: module_heads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_heads ALTER COLUMN id SET DEFAULT nextval('public.module_heads_id_seq'::regclass);


--
-- TOC entry 5059 (class 2604 OID 20436)
-- Name: module_master module_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_master ALTER COLUMN module_id SET DEFAULT nextval('public.module_master_module_id_seq'::regclass);


--
-- TOC entry 5062 (class 2604 OID 20448)
-- Name: module_section_field_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_field_options ALTER COLUMN id SET DEFAULT nextval('public.module_section_field_options_id_seq'::regclass);


--
-- TOC entry 5065 (class 2604 OID 20464)
-- Name: module_section_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_fields ALTER COLUMN id SET DEFAULT nextval('public.module_section_fields_id_seq'::regclass);


--
-- TOC entry 5071 (class 2604 OID 20487)
-- Name: module_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_sections ALTER COLUMN id SET DEFAULT nextval('public.module_sections_id_seq'::regclass);


--
-- TOC entry 5075 (class 2604 OID 20503)
-- Name: module_subhead_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_subhead_options ALTER COLUMN id SET DEFAULT nextval('public.module_subhead_options_id_seq'::regclass);


--
-- TOC entry 5079 (class 2604 OID 20521)
-- Name: module_subheads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_subheads ALTER COLUMN id SET DEFAULT nextval('public.module_subheads_id_seq'::regclass);


--
-- TOC entry 5084 (class 2604 OID 20540)
-- Name: module_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_templates ALTER COLUMN id SET DEFAULT nextval('public.module_templates_id_seq'::regclass);


--
-- TOC entry 5088 (class 2604 OID 20557)
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- TOC entry 5092 (class 2604 OID 20574)
-- Name: modules_master id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules_master ALTER COLUMN id SET DEFAULT nextval('public.modules_master_id_seq'::regclass);


--
-- TOC entry 5100 (class 2604 OID 20603)
-- Name: office_premise_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premise_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.office_premise_attachments_attachment_id_seq'::regclass);


--
-- TOC entry 5102 (class 2604 OID 20619)
-- Name: office_premises premise_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premises ALTER COLUMN premise_id SET DEFAULT nextval('public.office_premises_premise_id_seq'::regclass);


--
-- TOC entry 5108 (class 2604 OID 20644)
-- Name: office_premises_documents doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premises_documents ALTER COLUMN doc_id SET DEFAULT nextval('public.office_premises_documents_doc_id_seq'::regclass);


--
-- TOC entry 5112 (class 2604 OID 20685)
-- Name: premises_module_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premises_module_details ALTER COLUMN id SET DEFAULT nextval('public.premises_module_details_id_seq'::regclass);


--
-- TOC entry 5115 (class 2604 OID 20702)
-- Name: premises_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premises_types ALTER COLUMN id SET DEFAULT nextval('public.premises_types_id_seq'::regclass);


--
-- TOC entry 5116 (class 2604 OID 20711)
-- Name: property_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_types ALTER COLUMN id SET DEFAULT nextval('public.property_types_id_seq'::regclass);


--
-- TOC entry 5160 (class 2604 OID 74647)
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- TOC entry 5152 (class 2604 OID 32821)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 5148 (class 2604 OID 32800)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5141 (class 2604 OID 32777)
-- Name: smtp_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_configs ALTER COLUMN id SET DEFAULT nextval('public.smtp_configs_id_seq'::regclass);


--
-- TOC entry 5159 (class 2604 OID 40991)
-- Name: status_master id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_master ALTER COLUMN id SET DEFAULT nextval('public.status_master_id_seq'::regclass);


--
-- TOC entry 5117 (class 2604 OID 20720)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5139 (class 2604 OID 24635)
-- Name: vehicle_module_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_module_details ALTER COLUMN id SET DEFAULT nextval('public.vehicle_module_details_id_seq'::regclass);


--
-- TOC entry 5158 (class 2604 OID 40968)
-- Name: vehicle_usage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_usage ALTER COLUMN id SET DEFAULT nextval('public.vehicle_usage_id_seq'::regclass);


--
-- TOC entry 5135 (class 2604 OID 24620)
-- Name: vehicles vehicle_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN vehicle_id SET DEFAULT nextval('public.vehicles_vehicle_id_seq'::regclass);


--
-- TOC entry 5482 (class 0 OID 20246)
-- Dependencies: 220
-- Data for Name: area; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.area VALUES (1, 'Main Land') ON CONFLICT DO NOTHING;
INSERT INTO public.area VALUES (2, 'Free Zone') ON CONFLICT DO NOTHING;
INSERT INTO public.area VALUES (3, 'All') ON CONFLICT DO NOTHING;


--
-- TOC entry 5484 (class 0 OID 20254)
-- Dependencies: 222
-- Data for Name: asset_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5486 (class 0 OID 20269)
-- Dependencies: 224
-- Data for Name: asset_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.asset_categories VALUES (13, 85, 'iii', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.asset_categories VALUES (16, 1, 'IT Equipment', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.asset_categories VALUES (17, 1, 'laptop', NULL, 16) ON CONFLICT DO NOTHING;


--
-- TOC entry 5488 (class 0 OID 20281)
-- Dependencies: 226
-- Data for Name: asset_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5490 (class 0 OID 20298)
-- Dependencies: 228
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5492 (class 0 OID 20314)
-- Dependencies: 230
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5545 (class 0 OID 22874)
-- Dependencies: 283
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clients VALUES (1, 'Default Client', 'ACTIVE', 10, 200, 1000, '["dashboard", "assets", "premises", "employees"]', '2026-02-04 15:14:43.676143', '2026-02-04 15:14:43.676143', NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (2, 'Ansar Mall', 'ACTIVE', 5, 100, 500, '["assets"]', '2026-02-04 15:39:13.854151', '2026-02-04 15:39:13.854151', NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (3, 'Assas Genral Trading', 'ACTIVE', 5, 100, 500, '["employees"]', '2026-02-04 15:40:23.001659', '2026-02-04 17:51:07.808244', 'ASSAS', 'TL-48', '88', 'Sales and operation', NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, 'UAE', 'Sharjah', 'Sharjah', '99', '777', NULL, NULL, NULL, NULL, '8888', NULL, NULL, 'satheesh@gmail.com', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (7, 'Global Logistics Hub', 'ACTIVE', 8, 500, 2000, '["dashboard", "assets"]', '2026-02-05 12:03:21.732783', '2026-02-05 14:02:49.801584', 'GLH-DXB', 'TL-55667788', 'VAT-1004455223', 'Transportation & Logistics', '', 'RENTED', 'Emaar Properties PJSC', '2023-12-31', '2024-12-31', 'EJ-1234567', '', 'United Arab Emirates', 'Dubai', 'Dubai / Business Bay', 'Business Bay', 'Office 1502, Prism Tower, Marasi Drive', '12345', '12345', NULL, NULL, '+971 4 555 1234', 'info@globallogistics.com', 'https://globallogistics.com', 'support@globallogistics.com', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (8, 'test ', 'ACTIVE', 5, 444, 55, '["premises_display"]', '2026-02-05 13:51:34.282018', '2026-02-06 11:58:14.836771', 'jj', 'jj', '88', 'jjj', '', 'RENTED', 'j', '2026-02-06', '2027-02-07', '8855', '', 'jj', 'jj', 'jj', 'jj', 'jjj', 'p85', '78', NULL, NULL, '88855', '555', '55', '55', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (19, 'Noel Tech', 'ACTIVE', 5, 100, 500, '["dashboard", "vehicles", "module", "premises", "module_sections", "premises_display"]', '2026-02-12 12:20:20.042818', '2026-02-12 12:28:32.065546', '', '', '', 'it', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', NULL, NULL, '', '', '', '', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (11, 'Ahaliya Properties ', 'ACTIVE', 5, 100, 500, '["dashboard", "premises_display"]', '2026-02-06 12:14:29.825725', '2026-02-06 12:14:29.825725', 'acg', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', NULL, NULL, '', '', '', '', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (9, 'Abc trading LLC', 'ACTIVE', 5, 100, 500, '["dashboard", "premises_display"]', '2026-02-06 11:41:56.020277', '2026-02-06 12:19:18.300623', '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', NULL, NULL, '', '', '', '', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (12, 'ATC company', 'ACTIVE', 5, 100, 500, '["dashboard", "assets"]', '2026-02-06 12:18:42.213172', '2026-02-06 12:25:20.78995', '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', NULL, NULL, '', '', '', '', NULL, NULL, NULL, NULL, 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (41, 'Nuroil Trading FZE', 'ACTIVE', 10, 100, 500, '["dashboard", "vehicles", "companies", "assets", "employees", "module", "module_sections", "sub_modules", "reports"]', '2026-04-11 16:58:08.467809', '2026-04-11 16:58:08.467809', 'NUR', '', '', 'Trading', '', 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO public.clients VALUES (39, 'Company A', 'ACTIVE', 5, 100, 500, '["dashboard", "assets", "premises", "vehicles", "clients", "module", "module_sections", "sub_modules", "premises_display"]', '2026-02-28 11:37:54.036716', '2026-03-06 15:54:43.763643', 'BNG', '', '', 'Agriculture', '', 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '', '', '', NULL, NULL, 'superadmin@trakio.com', 'superadmin123', 'tls', NULL, NULL, 'COMPANY_ADMIN') ON CONFLICT DO NOTHING;


--
-- TOC entry 5494 (class 0 OID 20327)
-- Dependencies: 232
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.companies VALUES (26, 'Abc trading LLC (HQ)', NULL, 'ACTIVE', '2026-02-06 11:41:56.134465', '2026-02-06 11:41:56.134465', 9, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (38, 'Noel Tech (HQ)', NULL, 'ACTIVE', '2026-02-12 12:20:20.053283', '2026-02-12 12:20:20.053283', 19, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (39, ' (HQ)', NULL, 'ACTIVE', '2026-02-12 12:24:16.370995', '2026-02-12 12:24:16.370995', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (67, 'ttt (HQ)', NULL, 'ACTIVE', '2026-02-17 15:46:05.895971', '2026-02-17 15:46:05.895971', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (66, 'hhughghhg (HQ)', NULL, 'ACTIVE', '2026-02-17 15:03:12.09147', '2026-02-17 15:03:12.09147', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (65, 'jyuy (HQ)', NULL, 'ACTIVE', '2026-02-17 14:47:04.238862', '2026-02-17 14:47:04.238862', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (12, 'Global Logistics Hub (HQ)', NULL, 'ACTIVE', '2026-02-05 12:03:21.751537', '2026-02-05 12:03:21.751537', 7, true, 56, 88, 'tt', '6678', '777', 'yyyy', NULL, 'OWNED', '', NULL, NULL, NULL, NULL, 'uuu', 'uuu', 'uu', 'uuu', 'uuuu', '88', '5565', '8888', 'info@gmail', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (14, 'wqewq4', 'rwe', 'ACTIVE', '2026-02-05 12:55:09.332021', '2026-02-05 12:55:09.332021', 7, true, 10, 20, '3443', 'wrer', 'erwe', 'wew', '', 'OWNED', '', NULL, NULL, '', 'rewr', 'rwer', 'rerew', 'ewrwe', 'wer', 'erwe', 'erw', 'ewrwe', 'rwerwe', 'wer', 'wer', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (16, 'Comnapny 1', 'yy', 'ACTIVE', '2026-02-05 14:19:29.843217', '2026-02-05 14:19:29.843217', 8, true, 52, 90, 'yyy', 'yy', 'yy', 'yy', '', 'OWNED', '', NULL, NULL, '', '', 'yy', 'yy', 'yy', 'yy', 'yy', '778', '44', '87888', 'uuu', 'uuu', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (17, 'company 2', 'company2-419', 'ACTIVE', '2026-02-05 14:53:46.177922', '2026-02-05 14:53:46.177922', 8, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (18, 'company 3', 'company3-950', 'ACTIVE', '2026-02-05 15:22:42.124924', '2026-02-05 15:22:42.124924', 8, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (19, 'company 4', 'company4-360', 'ACTIVE', '2026-02-05 15:38:16.290318', '2026-02-05 15:38:16.290318', 8, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (20, 'test', 'test-972', 'ACTIVE', '2026-02-05 16:51:04.267447', '2026-02-05 16:51:04.267447', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (21, 'te3swt', 'te3swt-907', 'ACTIVE', '2026-02-05 19:00:17.87636', '2026-02-05 19:00:17.87636', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (22, 'terst', 'terst-201', 'ACTIVE', '2026-02-05 19:16:37.704048', '2026-02-05 19:16:37.704048', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (23, 'copmany777', 'copmany777-58', 'ACTIVE', '2026-02-05 19:19:15.142577', '2026-02-05 19:19:15.142577', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (24, 'test', 'test-778', 'ACTIVE', '2026-02-06 09:45:53.060392', '2026-02-06 09:45:53.060392', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (5, 'company 23', 'company2-532', 'ACTIVE', '2026-02-04 15:52:40.911656', '2026-02-04 15:52:40.911656', NULL, true, 10, 20, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (27, ' (HQ)', NULL, 'ACTIVE', '2026-02-06 11:52:09.203182', '2026-02-06 11:52:09.203182', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (28, 'Ahaliya Properties  (HQ)', NULL, 'ACTIVE', '2026-02-06 12:14:29.860836', '2026-02-06 12:14:29.860836', 11, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (29, 'ATC company (HQ)', NULL, 'ACTIVE', '2026-02-06 12:18:42.24897', '2026-02-06 12:18:42.24897', 12, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (30, ' (HQ)', NULL, 'ACTIVE', '2026-02-06 12:25:27.294939', '2026-02-06 12:25:27.294939', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (37, 'aits', 'aits-109', 'ACTIVE', '2026-02-12 10:05:52.58107', '2026-02-12 10:05:52.58107', 1, true, 10, 20, 'iiii', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (2, 'Tech Solutions Inc', 'techsol', 'ACTIVE', '2026-01-23 11:34:16', '2026-01-23 11:34:16', 1, true, 10, 20, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (3, 'Global Logistics', 'globallog', 'ACTIVE', '2026-01-23 11:34:16', '2026-01-23 11:34:16', 1, true, 10, 20, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (4, 'company 1', 'company1-474', 'ACTIVE', '2026-02-04 15:52:32.848202', '2026-02-04 15:52:32.848202', NULL, true, 10, 20, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (35, '444 (HQ)', NULL, 'ACTIVE', '2026-02-09 14:51:41.745079', '2026-02-09 14:51:41.745079', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (71, 'uiuygitfr86 6uytcs (HQ)', NULL, 'ACTIVE', '2026-02-18 10:24:18.323237', '2026-02-18 10:24:18.323237', NULL, true, 1, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (70, 'jjj (HQ)', NULL, 'ACTIVE', '2026-02-18 09:59:18.813289', '2026-02-18 09:59:18.813289', NULL, true, 18, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (64, 'hh (HQ)', NULL, 'ACTIVE', '2026-02-17 14:41:57.51006', '2026-02-17 14:41:57.51006', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (63, 'cih (HQ)', NULL, 'ACTIVE', '2026-02-17 14:34:24.497821', '2026-02-17 14:34:24.497821', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (62, 'hjj (HQ)', NULL, 'ACTIVE', '2026-02-17 14:19:45.498685', '2026-02-17 14:19:45.498685', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (72, 'hynccvcv (HQ)', NULL, 'ACTIVE', '2026-02-18 11:23:36.774573', '2026-02-18 11:23:36.774573', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (73, 'hhhhhhhhhhhhh', 'hhhhhhhhhhhhh-mlrqfb1m', 'ACTIVE', '2026-02-18 11:50:10.123444', '2026-02-18 11:50:10.123444', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (74, 'ghghggg', 'ghghggg-mlrqtw1k', 'ACTIVE', '2026-02-18 12:01:30.51767', '2026-02-18 12:01:30.51767', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (69, 'uuuu (HQ)', NULL, 'ACTIVE', '2026-02-18 09:51:07.380961', '2026-02-18 09:51:07.380961', NULL, true, 9, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (68, 'gvggg (HQ)', NULL, 'ACTIVE', '2026-02-17 17:16:30.292012', '2026-02-17 17:16:30.292012', NULL, true, 19, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (61, ' (HQ)', NULL, 'ACTIVE', '2026-02-16 16:51:00.818822', '2026-02-16 16:51:00.818822', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (60, 'AR Tech (HQ)', NULL, 'ACTIVE', '2026-02-16 11:11:34.304619', '2026-02-16 11:11:34.304619', NULL, true, 90, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (40, 'rrr', 'rrr-740', 'ACTIVE', '2026-02-13 14:25:38.196727', '2026-02-13 14:25:38.196727', NULL, true, 10, 20, 'rr', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (41, 'aaa', '888', 'ACTIVE', '2026-02-13 15:23:54.939455', '2026-02-13 15:23:54.939455', NULL, true, 10, 20, 'aa', '888', '888', 'aa', '', 'RENTED', '99', '2026-05-20', '2026-06-20', '99', '99', 'uu', 'uuu', 'uuu', 'uu', 'uu', '888', '88888888', '99', 'ii', 'ii', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (43, 'pp', 'iii', 'ACTIVE', '2026-02-13 16:24:10.351681', '2026-02-13 16:24:10.351681', NULL, true, 10, 88, 'iii', '99', '99', 'ii', '', 'RENTED', 'uuu', '2026-12-20', '2026-12-23', '000', 'ii', 'kk', 'kk', 'kk', 'oio', 'oo', '8787878', '77888', '888', '888', '88', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (34, ' (HQ)', NULL, 'ACTIVE', '2026-02-07 15:15:28.533303', '2026-02-07 15:15:28.533303', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (32, ' (HQ)', NULL, 'ACTIVE', '2026-02-07 11:02:41.471779', '2026-02-07 11:02:41.471779', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (33, 'tt', 'tt-627', 'ACTIVE', '2026-02-07 14:53:46.124218', '2026-02-07 14:53:46.124218', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (31, 'testttttt (HQ)', NULL, 'ACTIVE', '2026-02-06 12:30:48.796724', '2026-02-06 12:30:48.796724', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (82, ' (HQ)', NULL, 'ACTIVE', '2026-02-19 09:41:26.653397', '2026-02-19 09:41:26.653397', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (85, 'ByNuragro (HQ)', NULL, 'ACTIVE', '2026-02-28 11:37:54.044263', '2026-02-28 11:37:54.044263', 39, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (87, 'ssds', 'ssds-mnmrqpet', 'ACTIVE', '2026-04-06 09:47:35.365554', '2026-04-06 09:47:35.365554', 7, true, 10, 20, 'sss', '', '', 'ss', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (1, 'TRakio HQ Main', 'admin', 'ACTIVE', '2026-04-06 11:42:38.49443', '2026-04-06 11:42:38.49443', NULL, true, 10, 20, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (78, 'Muthoot  (HQ)', NULL, 'ACTIVE', '2026-02-18 14:43:09.480599', '2026-02-18 14:43:09.480599', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (79, 'Agro', 'agro-mlrx7mjd', 'ACTIVE', '2026-02-18 15:00:09.076528', '2026-02-18 15:00:09.076528', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (80, 'Jonsons', 'jonsons-mlrxodao', 'ACTIVE', '2026-02-18 15:13:10.250835', '2026-02-18 15:13:10.250835', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (86, 'K_jwl (HQ)', NULL, 'ACTIVE', '2026-03-06 10:35:05.368007', '2026-03-06 10:35:05.368007', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (89, 'TMT ', 'tmt-mnn4wifg', 'ACTIVE', '2026-04-06 15:56:01.261058', '2026-04-06 15:56:01.261058', 7, true, 10, 20, 'ewe', '', '', 'ewr', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (90, '5666', '5666-mnn4yt9x', 'ACTIVE', '2026-04-06 15:57:48.605329', '2026-04-06 15:57:48.605329', 7, true, 10, 20, '5665', '', '', '656', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (91, '6yytyt', '6yytyt-mnn5316e', 'ACTIVE', '2026-04-06 16:01:05.469235', '2026-04-06 16:01:05.469235', 7, true, 10, 20, 'tryt', '', '', 'trtr', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets", "maintenance"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (92, '65y 5', '65y5-mnn5dpj8', 'ACTIVE', '2026-04-06 16:09:23.639857', '2026-04-06 16:09:23.639857', 7, true, 10, 20, '6y565', '', '', '65656556665', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (93, 'rrr', 'rrr-mnn7c8l8', 'ACTIVE', '2026-04-06 17:04:14.239686', '2026-04-06 17:04:14.239686', NULL, true, 10, 20, 'rr', '', '', 'rr', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (95, 'ewew', 'ewew-mnn7xhrr', 'ACTIVE', '2026-04-06 17:20:45.913791', '2026-04-06 17:20:45.913791', NULL, true, 10, 20, 'eew', '', '', 'ewew', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (96, '554', '554-mnn7zrxs', 'ACTIVE', '2026-04-06 17:22:32.387118', '2026-04-06 17:22:32.387118', NULL, true, 10, 20, '545', '', '', '55', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (84, 'sss (HQ)', NULL, 'ACTIVE', '2026-02-26 12:43:39.626555', '2026-02-26 12:43:39.626555', NULL, true, 9, 99, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (83, 'techo  (HQ)', NULL, 'ACTIVE', '2026-02-26 12:20:04.969578', '2026-02-26 12:20:04.969578', NULL, true, 199, 88, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (81, 'TMT  (HQ)', NULL, 'ACTIVE', '2026-02-18 15:36:08.219872', '2026-02-18 15:36:08.219872', NULL, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (75, 'mygggg', 'mygggg-mlrt6u9r', 'ACTIVE', '2026-02-18 13:07:34.094703', '2026-02-18 13:07:34.094703', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (76, 'mmm', 'mmm-mlrw28kz', 'ACTIVE', '2026-02-18 14:27:58.215906', '2026-02-18 14:27:58.215906', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (77, 'Mina Supermarket', 'minasupermarket-mlrwf3ve', 'ACTIVE', '2026-02-18 14:37:58.498157', '2026-02-18 14:37:58.498157', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (44, 'mynthra', '9ii', 'ACTIVE', '2026-02-13 16:42:50.356299', '2026-02-13 16:42:50.356299', NULL, true, 10, 99, 'yy', '99', '99', 'yy', '', 'RENTED', 'uuu', '2026-08-22', NULL, '99', 'uu', '99', '99', '99', '99', '99', '78778', '989898', '7888', '788', '878', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (45, 'SSD institute ', '99', 'ACTIVE', '2026-02-13 16:55:14.229785', '2026-02-13 16:55:14.229785', NULL, true, 10, 99, 'ttt', '99', '99', 'tt', '', 'RENTED', '', NULL, NULL, '', '99', 'uu', 'uu', 'uu', 'uu', 'uu', '88', '88', '888', '88', '88', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (54, 'oooooo', 'll', 'ACTIVE', '2026-02-13 17:25:54.024633', '2026-02-13 17:25:54.024633', NULL, true, 10, 90, 'oo', '887', '788', 'oo', '', 'RENTED', 'iii', '2026-06-20', '2026-06-21', '777', '', 'yyu', 'yy', 'yy', 'yy', 'yy', '67', '787', '8998', '8987', '8998', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (55, 'test company', 'iiiuh', 'ACTIVE', '2026-02-14 09:16:09.557305', '2026-02-14 09:16:09.557305', NULL, true, 10, 20, 'tttt', '887887', '87745858', 'iii', '', 'OWNED', '', NULL, NULL, '', '875r65r', 'du', 'k, mjn', 'jjykj', 'juhyi', 'lk768h', '87658', '47897', '9i0875532', 'l;uiredetr', 'gfwq', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (56, 'gfghgh', 'fyg', 'ACTIVE', '2026-02-14 09:42:09.627451', '2026-02-14 09:42:09.627451', NULL, true, 10, 89, 'fggf', '888', '8787', 'ggg', '', 'OWNED', '', NULL, NULL, '', '77', 'iuiu', 'uiuu', 'yyuu', 'yuuy', 'yuyu', '7877', '877', '887', 'ooo', 'iii', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (57, 'test 2 ', 'test2-mllw3rct', 'ACTIVE', '2026-02-14 09:42:32.003431', '2026-02-14 09:42:32.003431', NULL, true, 10, 20, '', '', '', '', '', 'OWNED', '', NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (58, 'yy', 'hh', 'ACTIVE', '2026-02-14 09:48:20.494357', '2026-02-14 09:48:20.494357', NULL, true, 10, 8, 'yy', '89098', '899', '8u8uy', '', 'OWNED', '', NULL, NULL, '', '88', 'uu', 'uu', 'uu', 'uu', 'uu', '898', '988', '76', 'jkh', '', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (59, 'test', 'hhh', 'ACTIVE', '2026-02-16 10:53:16.582259', '2026-02-16 10:53:16.582259', NULL, true, 10, 78, 'hhh', 'hh', 'hh', 'hh', '', 'OWNED', '', NULL, NULL, '', 'hh', 'hh', 'hhh', 'hh', 'hh', 'hh', '878', '77887', '777', '8767', '677', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (36, 'ww (HQ)', NULL, 'ACTIVE', '2026-02-09 14:54:18.299756', '2026-02-09 14:54:18.299756', NULL, true, 81, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (97, '5rr', '5rr-mno8qfnt', 'ACTIVE', '2026-04-07 10:31:02.351876', '2026-04-07 10:31:02.351876', NULL, true, 10, 20, 'rr', '', '', 'rr', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (98, 'ee', 'ee-mno8t9b5', 'ACTIVE', '2026-04-07 10:33:14.116906', '2026-04-07 10:33:14.116906', NULL, true, 10, 20, 'eee', '', '', 'e', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (102, 'ByNuragro', 'bynuragro-mnud5bx3', 'ACTIVE', '2026-04-11 17:21:12.906146', '2026-04-11 17:21:12.906146', 41, true, 10, 20, 'BN', '', '', 'Agriculture', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (103, 'Nuragro', 'nuragro-mnud8j71', 'ACTIVE', '2026-04-11 17:23:42.393732', '2026-04-11 17:23:42.393732', 41, true, 10, 20, 'NGO', '', '', 'Agriculture', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (101, 'ASAS General Trading', 'asasgeneraltrading-mnuckqee', 'ACTIVE', '2026-04-11 17:05:11.881142', '2026-04-11 17:05:11.881142', 41, true, 10, 20, 'AGT', '', '', 'IT', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets", "vehicles"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (100, 'Nuroil Trading FZE (HQ)', NULL, 'ACTIVE', '2026-04-11 16:58:08.473616', '2026-04-11 16:58:08.473616', 41, true, 100, 500, NULL, NULL, NULL, NULL, NULL, 'OWNED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '["dashboard", "assets"]') ON CONFLICT DO NOTHING;
INSERT INTO public.companies VALUES (108, 'AGST', 'agst-mo2m76xc', 'ACTIVE', '2026-04-17 11:56:45.682873', '2026-04-17 11:56:45.682873', 41, true, 10, 20, 'www', '', '', 'ee', '', 'LEASED', '', NULL, NULL, NULL, NULL, 'United Arab Emirates', NULL, 'Dubai', '', '', NULL, NULL, '', '', '', '["dashboard", "assets"]') ON CONFLICT DO NOTHING;


--
-- TOC entry 5547 (class 0 OID 22903)
-- Dependencies: 285
-- Data for Name: company_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.company_documents VALUES (1, 56, 'NPL Budget (1).pdf', '/uploads/companies/1771047729746_NPL_Budget_(1).pdf', 'application/pdf', '2026-02-14 09:42:09.74796') ON CONFLICT DO NOTHING;
INSERT INTO public.company_documents VALUES (2, 58, 'NPL Budget (1).pdf', '/uploads/companies/1771048100604_NPL_Budget_(1).pdf', 'application/pdf', '2026-02-14 09:48:20.629982') ON CONFLICT DO NOTHING;
INSERT INTO public.company_documents VALUES (3, 59, 'NPL Budget (1).pdf', '/uploads/companies/1771224796708_NPL_Budget_(1).pdf', 'application/pdf', '2026-02-16 10:53:16.710368') ON CONFLICT DO NOTHING;


--
-- TOC entry 5496 (class 0 OID 20343)
-- Dependencies: 234
-- Data for Name: company_module_field_selection; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.company_module_field_selection VALUES (3234, 131, 795, '2026-04-27 15:13:36.555625') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3235, 131, 814, '2026-04-27 15:13:36.555625') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3283, 132, 763, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3284, 132, 764, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3285, 132, 765, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3286, 132, 766, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3287, 132, 767, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3288, 132, 770, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3289, 132, 771, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3290, 132, 815, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3291, 132, 816, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3292, 132, 818, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3293, 132, 819, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3294, 132, 820, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3295, 132, 821, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3296, 132, 822, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3297, 132, 823, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3298, 132, 824, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3299, 132, 826, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3300, 132, 827, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3301, 132, 828, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3302, 132, 829, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3303, 132, 830, '2026-04-28 13:08:06.139135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2970, 115, 453, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2971, 115, 461, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2972, 115, 462, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2973, 115, 463, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2974, 115, 464, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2975, 115, 465, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2976, 115, 466, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2977, 115, 467, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2978, 115, 468, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2979, 115, 469, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2980, 115, 472, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2981, 115, 486, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2982, 115, 487, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2983, 115, 489, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2984, 115, 518, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2985, 115, 519, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2986, 115, 528, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2987, 115, 548, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2988, 115, 604, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2989, 115, 607, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2990, 115, 632, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2991, 115, 633, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2992, 115, 634, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2993, 115, 635, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2994, 115, 661, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2995, 115, 692, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2996, 115, 693, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2997, 115, 694, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2998, 115, 695, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (2999, 115, 696, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3000, 115, 698, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3001, 115, 699, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3002, 115, 700, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3003, 115, 701, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3004, 115, 702, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3005, 115, 703, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3006, 115, 704, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3007, 115, 705, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3008, 115, 706, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3009, 115, 707, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3010, 115, 708, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3011, 115, 709, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3012, 115, 710, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3013, 115, 711, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3014, 115, 712, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3015, 115, 715, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3016, 115, 716, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3017, 115, 717, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3018, 115, 730, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3019, 115, 732, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3020, 115, 737, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3021, 115, 738, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3022, 115, 739, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3023, 115, 740, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3024, 115, 741, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3025, 115, 742, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3026, 115, 743, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3027, 115, 744, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3028, 115, 745, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3029, 115, 746, '2026-04-22 09:56:43.2122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3304, 128, 747, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3305, 128, 748, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3306, 128, 749, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3307, 128, 750, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3308, 128, 751, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3309, 128, 752, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3310, 128, 753, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3311, 128, 754, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3312, 128, 755, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (836, 108, 424, '2026-04-15 15:11:49.114295') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (837, 108, 425, '2026-04-15 15:11:49.114509') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (838, 108, 426, '2026-04-15 15:11:49.114676') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (839, 108, 427, '2026-04-15 15:11:49.114847') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (840, 108, 428, '2026-04-15 15:11:49.115004') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (841, 108, 429, '2026-04-15 15:11:49.115222') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (842, 108, 430, '2026-04-15 15:11:49.115449') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (843, 108, 431, '2026-04-15 15:11:49.115814') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (844, 108, 432, '2026-04-15 15:11:49.116037') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (845, 108, 433, '2026-04-15 15:11:49.116199') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (846, 108, 434, '2026-04-15 15:11:49.116415') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (847, 108, 435, '2026-04-15 15:11:49.116693') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (848, 108, 436, '2026-04-15 15:11:49.117028') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (849, 108, 437, '2026-04-15 15:11:49.117281') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (850, 108, 438, '2026-04-15 15:11:49.117451') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (851, 108, 439, '2026-04-15 15:11:49.11761') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (852, 108, 440, '2026-04-15 15:11:49.117764') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (853, 108, 441, '2026-04-15 15:11:49.117904') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (854, 108, 444, '2026-04-15 15:11:49.118067') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (855, 108, 445, '2026-04-15 15:11:49.118212') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (856, 108, 446, '2026-04-15 15:11:49.118357') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (857, 108, 447, '2026-04-15 15:11:49.118499') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (858, 108, 448, '2026-04-15 15:11:49.118641') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (859, 108, 449, '2026-04-15 15:11:49.11879') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (860, 108, 450, '2026-04-15 15:11:49.118949') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (861, 108, 451, '2026-04-15 15:11:49.119701') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (862, 108, 452, '2026-04-15 15:11:49.120256') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (863, 108, 253, '2026-04-15 15:11:49.120607') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (864, 108, 254, '2026-04-15 15:11:49.120984') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (865, 108, 255, '2026-04-15 15:11:49.123472') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (866, 108, 256, '2026-04-15 15:11:49.124975') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (867, 108, 257, '2026-04-15 15:11:49.125854') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (868, 108, 258, '2026-04-15 15:11:49.126461') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3313, 128, 756, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3314, 128, 757, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3315, 128, 758, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3316, 128, 759, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3317, 128, 760, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3318, 128, 761, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3319, 128, 762, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3320, 128, 795, '2026-04-28 15:25:41.586316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (869, 108, 259, '2026-04-15 15:11:49.126968') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (870, 108, 260, '2026-04-15 15:11:49.12965') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (871, 108, 261, '2026-04-15 15:11:49.130134') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (872, 108, 262, '2026-04-15 15:11:49.130457') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (873, 108, 263, '2026-04-15 15:11:49.130762') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (874, 108, 264, '2026-04-15 15:11:49.13098') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (875, 108, 265, '2026-04-15 15:11:49.131161') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (876, 108, 266, '2026-04-15 15:11:49.131334') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (877, 108, 267, '2026-04-15 15:11:49.131487') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (878, 108, 278, '2026-04-15 15:11:49.131626') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (879, 108, 279, '2026-04-15 15:11:49.131781') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (880, 108, 280, '2026-04-15 15:11:49.131975') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (881, 108, 281, '2026-04-15 15:11:49.132354') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (882, 108, 282, '2026-04-15 15:11:49.132556') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (883, 108, 283, '2026-04-15 15:11:49.132704') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (884, 108, 284, '2026-04-15 15:11:49.132845') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (885, 108, 286, '2026-04-15 15:11:49.132981') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (886, 108, 287, '2026-04-15 15:11:49.133118') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (887, 108, 288, '2026-04-15 15:11:49.133277') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (888, 108, 289, '2026-04-15 15:11:49.133506') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (889, 108, 290, '2026-04-15 15:11:49.133685') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (890, 108, 291, '2026-04-15 15:11:49.133862') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (891, 108, 292, '2026-04-15 15:11:49.134037') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (892, 108, 293, '2026-04-15 15:11:49.134198') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (893, 108, 294, '2026-04-15 15:11:49.134341') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (894, 108, 296, '2026-04-15 15:11:49.134475') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (895, 108, 297, '2026-04-15 15:11:49.134608') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (896, 108, 298, '2026-04-15 15:11:49.134739') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (897, 108, 299, '2026-04-15 15:11:49.134884') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (898, 108, 300, '2026-04-15 15:11:49.135197') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (899, 108, 302, '2026-04-15 15:11:49.1354') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (900, 108, 303, '2026-04-15 15:11:49.135789') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (901, 108, 304, '2026-04-15 15:11:49.136032') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (902, 108, 305, '2026-04-15 15:11:49.136192') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (903, 108, 307, '2026-04-15 15:11:49.136464') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (904, 108, 308, '2026-04-15 15:11:49.136608') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (905, 108, 309, '2026-04-15 15:11:49.136744') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (906, 108, 322, '2026-04-15 15:11:49.136886') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (907, 108, 323, '2026-04-15 15:11:49.137286') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (908, 108, 324, '2026-04-15 15:11:49.137502') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (909, 108, 325, '2026-04-15 15:11:49.137667') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (910, 108, 326, '2026-04-15 15:11:49.137811') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (911, 108, 327, '2026-04-15 15:11:49.137949') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (912, 108, 328, '2026-04-15 15:11:49.138081') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (913, 108, 329, '2026-04-15 15:11:49.13821') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (914, 108, 362, '2026-04-15 15:11:49.13834') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (915, 108, 363, '2026-04-15 15:11:49.138473') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (916, 108, 364, '2026-04-15 15:11:49.138604') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (917, 108, 365, '2026-04-15 15:11:49.138733') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (918, 108, 366, '2026-04-15 15:11:49.13886') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (919, 108, 367, '2026-04-15 15:11:49.138989') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (920, 108, 368, '2026-04-15 15:11:49.139141') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (921, 108, 369, '2026-04-15 15:11:49.139281') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (922, 108, 370, '2026-04-15 15:11:49.139523') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (923, 108, 373, '2026-04-15 15:11:49.1398') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (924, 108, 374, '2026-04-15 15:11:49.140267') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (925, 108, 375, '2026-04-15 15:11:49.140946') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (926, 108, 376, '2026-04-15 15:11:49.141418') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (927, 108, 377, '2026-04-15 15:11:49.141941') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (928, 108, 378, '2026-04-15 15:11:49.142479') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (929, 108, 379, '2026-04-15 15:11:49.142792') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (930, 108, 380, '2026-04-15 15:11:49.143051') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (931, 108, 381, '2026-04-15 15:11:49.143245') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (932, 108, 382, '2026-04-15 15:11:49.143397') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (933, 108, 383, '2026-04-15 15:11:49.143541') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (934, 108, 384, '2026-04-15 15:11:49.143682') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (935, 108, 385, '2026-04-15 15:11:49.14382') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (936, 108, 386, '2026-04-15 15:11:49.143957') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (937, 108, 387, '2026-04-15 15:11:49.144104') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (938, 108, 388, '2026-04-15 15:11:49.144252') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (939, 108, 389, '2026-04-15 15:11:49.144391') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (940, 108, 390, '2026-04-15 15:11:49.14453') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (941, 108, 391, '2026-04-15 15:11:49.144669') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (942, 108, 392, '2026-04-15 15:11:49.144826') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (943, 108, 393, '2026-04-15 15:11:49.144969') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (944, 108, 394, '2026-04-15 15:11:49.145116') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (945, 108, 395, '2026-04-15 15:11:49.145253') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (946, 108, 396, '2026-04-15 15:11:49.145398') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (947, 108, 397, '2026-04-15 15:11:49.145652') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (948, 108, 398, '2026-04-15 15:11:49.146183') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (949, 108, 399, '2026-04-15 15:11:49.146561') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (950, 108, 400, '2026-04-15 15:11:49.146958') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (951, 108, 401, '2026-04-15 15:11:49.147277') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (952, 108, 402, '2026-04-15 15:11:49.14766') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (953, 108, 403, '2026-04-15 15:11:49.148392') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (954, 108, 404, '2026-04-15 15:11:49.148624') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (955, 108, 405, '2026-04-15 15:11:49.148823') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (956, 108, 406, '2026-04-15 15:11:49.149001') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (957, 108, 407, '2026-04-15 15:11:49.149171') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (958, 108, 408, '2026-04-15 15:11:49.149358') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (959, 108, 409, '2026-04-15 15:11:49.149537') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (960, 108, 410, '2026-04-15 15:11:49.14974') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (961, 108, 411, '2026-04-15 15:11:49.149923') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (962, 108, 412, '2026-04-15 15:11:49.150086') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (963, 108, 413, '2026-04-15 15:11:49.151459') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (964, 108, 414, '2026-04-15 15:11:49.151685') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (965, 108, 415, '2026-04-15 15:11:49.15183') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (966, 108, 416, '2026-04-15 15:11:49.151965') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (967, 108, 417, '2026-04-15 15:11:49.152096') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (968, 108, 418, '2026-04-15 15:11:49.152232') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (969, 108, 419, '2026-04-15 15:11:49.15238') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (970, 108, 420, '2026-04-15 15:11:49.15251') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (971, 108, 421, '2026-04-15 15:11:49.152639') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (972, 108, 422, '2026-04-15 15:11:49.152766') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (973, 108, 423, '2026-04-15 15:11:49.152893') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3083, 129, 772, '2026-04-25 12:46:17.708653') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1112, 94, 424, '2026-04-15 16:08:52.670459') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1113, 94, 425, '2026-04-15 16:08:52.687473') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1114, 94, 426, '2026-04-15 16:08:52.688674') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1115, 94, 427, '2026-04-15 16:08:52.689838') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1116, 94, 428, '2026-04-15 16:08:52.690626') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1117, 94, 429, '2026-04-15 16:08:52.691122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1118, 94, 430, '2026-04-15 16:08:52.691678') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1119, 94, 431, '2026-04-15 16:08:52.692169') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1120, 94, 432, '2026-04-15 16:08:52.692534') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1121, 94, 433, '2026-04-15 16:08:52.693124') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1122, 94, 434, '2026-04-15 16:08:52.693627') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1123, 94, 435, '2026-04-15 16:08:52.694039') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1124, 94, 436, '2026-04-15 16:08:52.694399') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1125, 94, 437, '2026-04-15 16:08:52.694794') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1126, 94, 438, '2026-04-15 16:08:52.696485') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1127, 94, 439, '2026-04-15 16:08:52.698604') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1128, 94, 440, '2026-04-15 16:08:52.70017') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1129, 94, 441, '2026-04-15 16:08:52.701238') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1130, 94, 444, '2026-04-15 16:08:52.702403') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1131, 94, 445, '2026-04-15 16:08:52.703089') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1132, 94, 446, '2026-04-15 16:08:52.70345') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1133, 94, 447, '2026-04-15 16:08:52.703789') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1134, 94, 448, '2026-04-15 16:08:52.704194') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1135, 94, 449, '2026-04-15 16:08:52.70475') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1136, 94, 450, '2026-04-15 16:08:52.705105') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1137, 94, 451, '2026-04-15 16:08:52.705385') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1138, 94, 452, '2026-04-15 16:08:52.705681') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1139, 94, 253, '2026-04-15 16:08:52.705951') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1140, 94, 254, '2026-04-15 16:08:52.706235') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1141, 94, 255, '2026-04-15 16:08:52.706523') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1142, 94, 256, '2026-04-15 16:08:52.70693') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1143, 94, 257, '2026-04-15 16:08:52.70717') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1144, 94, 258, '2026-04-15 16:08:52.707584') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1145, 94, 259, '2026-04-15 16:08:52.707958') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1146, 94, 260, '2026-04-15 16:08:52.708267') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1147, 94, 261, '2026-04-15 16:08:52.708594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1148, 94, 262, '2026-04-15 16:08:52.708868') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1149, 94, 263, '2026-04-15 16:08:52.709139') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1150, 94, 264, '2026-04-15 16:08:52.709357') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1151, 94, 265, '2026-04-15 16:08:52.709655') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1152, 94, 266, '2026-04-15 16:08:52.709937') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1153, 94, 267, '2026-04-15 16:08:52.710108') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1154, 94, 278, '2026-04-15 16:08:52.710262') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1155, 94, 279, '2026-04-15 16:08:52.710411') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1156, 94, 280, '2026-04-15 16:08:52.710641') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1157, 94, 281, '2026-04-15 16:08:52.710795') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1158, 94, 282, '2026-04-15 16:08:52.710964') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1159, 94, 283, '2026-04-15 16:08:52.711113') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1160, 94, 284, '2026-04-15 16:08:52.711259') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1161, 94, 286, '2026-04-15 16:08:52.711402') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1162, 94, 287, '2026-04-15 16:08:52.711555') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1163, 94, 288, '2026-04-15 16:08:52.711708') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1164, 94, 289, '2026-04-15 16:08:52.711885') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1165, 94, 290, '2026-04-15 16:08:52.712096') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1166, 94, 291, '2026-04-15 16:08:52.712251') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1167, 94, 292, '2026-04-15 16:08:52.712448') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1168, 94, 293, '2026-04-15 16:08:52.712663') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1169, 94, 294, '2026-04-15 16:08:52.71287') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1170, 94, 296, '2026-04-15 16:08:52.713028') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1171, 94, 297, '2026-04-15 16:08:52.713168') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1172, 94, 298, '2026-04-15 16:08:52.713331') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1173, 94, 299, '2026-04-15 16:08:52.713584') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1174, 94, 300, '2026-04-15 16:08:52.713773') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1175, 94, 302, '2026-04-15 16:08:52.71392') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1176, 94, 303, '2026-04-15 16:08:52.714061') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1177, 94, 304, '2026-04-15 16:08:52.714197') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1178, 94, 305, '2026-04-15 16:08:52.71434') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1179, 94, 307, '2026-04-15 16:08:52.714519') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1180, 94, 308, '2026-04-15 16:08:52.714878') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1181, 94, 309, '2026-04-15 16:08:52.715359') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1182, 94, 322, '2026-04-15 16:08:52.715687') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1183, 94, 323, '2026-04-15 16:08:52.716255') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1184, 94, 324, '2026-04-15 16:08:52.718479') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1185, 94, 325, '2026-04-15 16:08:52.719228') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1186, 94, 326, '2026-04-15 16:08:52.719504') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1187, 94, 327, '2026-04-15 16:08:52.719694') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1188, 94, 328, '2026-04-15 16:08:52.719904') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1189, 94, 329, '2026-04-15 16:08:52.720066') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1190, 94, 362, '2026-04-15 16:08:52.720257') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1191, 94, 363, '2026-04-15 16:08:52.720567') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1192, 94, 364, '2026-04-15 16:08:52.720747') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1193, 94, 365, '2026-04-15 16:08:52.720902') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1194, 94, 366, '2026-04-15 16:08:52.721051') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1195, 94, 367, '2026-04-15 16:08:52.721199') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1196, 94, 368, '2026-04-15 16:08:52.721343') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1197, 94, 369, '2026-04-15 16:08:52.721492') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1198, 94, 370, '2026-04-15 16:08:52.721649') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1199, 94, 373, '2026-04-15 16:08:52.721847') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1200, 94, 374, '2026-04-15 16:08:52.722049') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1201, 94, 375, '2026-04-15 16:08:52.722229') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1202, 94, 376, '2026-04-15 16:08:52.722408') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1203, 94, 377, '2026-04-15 16:08:52.722609') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1204, 94, 378, '2026-04-15 16:08:52.722928') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1205, 94, 379, '2026-04-15 16:08:52.723154') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1206, 94, 380, '2026-04-15 16:08:52.723296') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1207, 94, 381, '2026-04-15 16:08:52.723436') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1208, 94, 382, '2026-04-15 16:08:52.723575') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1209, 94, 383, '2026-04-15 16:08:52.723717') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1210, 94, 384, '2026-04-15 16:08:52.724065') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1211, 94, 385, '2026-04-15 16:08:52.724663') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1212, 94, 386, '2026-04-15 16:08:52.725145') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1213, 94, 387, '2026-04-15 16:08:52.725489') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1214, 94, 388, '2026-04-15 16:08:52.725896') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1215, 94, 389, '2026-04-15 16:08:52.726216') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1216, 94, 390, '2026-04-15 16:08:52.726422') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1217, 94, 391, '2026-04-15 16:08:52.726599') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1218, 94, 392, '2026-04-15 16:08:52.726761') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1219, 94, 393, '2026-04-15 16:08:52.72691') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1220, 94, 394, '2026-04-15 16:08:52.727058') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1221, 94, 395, '2026-04-15 16:08:52.727209') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1222, 94, 396, '2026-04-15 16:08:52.727387') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1223, 94, 397, '2026-04-15 16:08:52.72768') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1224, 94, 398, '2026-04-15 16:08:52.72785') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1225, 94, 399, '2026-04-15 16:08:52.727999') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1226, 94, 400, '2026-04-15 16:08:52.728138') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1227, 94, 401, '2026-04-15 16:08:52.728275') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1228, 94, 402, '2026-04-15 16:08:52.728411') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1229, 94, 403, '2026-04-15 16:08:52.728549') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1230, 94, 404, '2026-04-15 16:08:52.728684') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1231, 94, 405, '2026-04-15 16:08:52.728817') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1232, 94, 406, '2026-04-15 16:08:52.728999') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1233, 94, 407, '2026-04-15 16:08:52.729144') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1234, 94, 408, '2026-04-15 16:08:52.729279') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1235, 94, 409, '2026-04-15 16:08:52.729569') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1236, 94, 410, '2026-04-15 16:08:52.729976') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1237, 94, 411, '2026-04-15 16:08:52.730206') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1238, 94, 412, '2026-04-15 16:08:52.730374') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1239, 94, 413, '2026-04-15 16:08:52.730528') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1240, 94, 414, '2026-04-15 16:08:52.730675') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1241, 94, 415, '2026-04-15 16:08:52.730954') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1242, 94, 416, '2026-04-15 16:08:52.731251') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1243, 94, 417, '2026-04-15 16:08:52.73164') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1244, 94, 418, '2026-04-15 16:08:52.732092') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1245, 94, 419, '2026-04-15 16:08:52.733027') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1246, 94, 420, '2026-04-15 16:08:52.734178') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1247, 94, 421, '2026-04-15 16:08:52.734903') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1248, 94, 422, '2026-04-15 16:08:52.735467') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1249, 94, 423, '2026-04-15 16:08:52.735803') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1250, 109, 424, '2026-04-15 16:08:52.737213') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1251, 109, 425, '2026-04-15 16:08:52.737513') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1252, 109, 426, '2026-04-15 16:08:52.737731') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1253, 109, 427, '2026-04-15 16:08:52.737903') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1254, 109, 428, '2026-04-15 16:08:52.738106') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1255, 109, 429, '2026-04-15 16:08:52.738292') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1256, 109, 430, '2026-04-15 16:08:52.738509') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1257, 109, 431, '2026-04-15 16:08:52.738831') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1258, 109, 432, '2026-04-15 16:08:52.739115') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1259, 109, 433, '2026-04-15 16:08:52.739373') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1260, 109, 434, '2026-04-15 16:08:52.739639') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1261, 109, 435, '2026-04-15 16:08:52.739838') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1262, 109, 436, '2026-04-15 16:08:52.740003') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1263, 109, 437, '2026-04-15 16:08:52.740267') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1264, 109, 438, '2026-04-15 16:08:52.740858') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1265, 109, 439, '2026-04-15 16:08:52.741391') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1266, 109, 440, '2026-04-15 16:08:52.74166') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1267, 109, 441, '2026-04-15 16:08:52.74185') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1268, 109, 444, '2026-04-15 16:08:52.742163') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1269, 109, 445, '2026-04-15 16:08:52.742325') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1270, 109, 446, '2026-04-15 16:08:52.742548') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1271, 109, 447, '2026-04-15 16:08:52.742718') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1272, 109, 448, '2026-04-15 16:08:52.743159') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1273, 109, 449, '2026-04-15 16:08:52.743508') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1274, 109, 450, '2026-04-15 16:08:52.743726') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1275, 109, 451, '2026-04-15 16:08:52.74395') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1276, 109, 452, '2026-04-15 16:08:52.744358') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1277, 109, 253, '2026-04-15 16:08:52.744581') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1278, 109, 254, '2026-04-15 16:08:52.744776') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1279, 109, 255, '2026-04-15 16:08:52.74496') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1280, 109, 256, '2026-04-15 16:08:52.745113') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1281, 109, 257, '2026-04-15 16:08:52.745381') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1282, 109, 258, '2026-04-15 16:08:52.745601') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1283, 109, 259, '2026-04-15 16:08:52.746202') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1284, 109, 260, '2026-04-15 16:08:52.746637') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1285, 109, 261, '2026-04-15 16:08:52.746891') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1286, 109, 262, '2026-04-15 16:08:52.747084') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1287, 109, 263, '2026-04-15 16:08:52.747252') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1288, 109, 264, '2026-04-15 16:08:52.747411') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1289, 109, 265, '2026-04-15 16:08:52.747584') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1290, 109, 266, '2026-04-15 16:08:52.747739') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1291, 109, 267, '2026-04-15 16:08:52.747884') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1292, 109, 278, '2026-04-15 16:08:52.748049') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1293, 109, 279, '2026-04-15 16:08:52.748244') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1294, 109, 280, '2026-04-15 16:08:52.748707') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1295, 109, 281, '2026-04-15 16:08:52.749042') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1296, 109, 282, '2026-04-15 16:08:52.749254') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1297, 109, 283, '2026-04-15 16:08:52.749815') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1298, 109, 284, '2026-04-15 16:08:52.750282') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1299, 109, 286, '2026-04-15 16:08:52.750567') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1300, 109, 287, '2026-04-15 16:08:52.750922') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1301, 109, 288, '2026-04-15 16:08:52.751441') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1302, 109, 289, '2026-04-15 16:08:52.751791') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1303, 109, 290, '2026-04-15 16:08:52.751989') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1304, 109, 291, '2026-04-15 16:08:52.752143') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1305, 109, 292, '2026-04-15 16:08:52.752285') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1306, 109, 293, '2026-04-15 16:08:52.752421') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1307, 109, 294, '2026-04-15 16:08:52.752558') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1308, 109, 296, '2026-04-15 16:08:52.75269') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1309, 109, 297, '2026-04-15 16:08:52.752852') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1310, 109, 298, '2026-04-15 16:08:52.75315') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1311, 109, 299, '2026-04-15 16:08:52.753316') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1312, 109, 300, '2026-04-15 16:08:52.753587') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1313, 109, 302, '2026-04-15 16:08:52.753874') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1314, 109, 303, '2026-04-15 16:08:52.754043') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1315, 109, 304, '2026-04-15 16:08:52.754321') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1316, 109, 305, '2026-04-15 16:08:52.754459') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1317, 109, 307, '2026-04-15 16:08:52.754593') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1318, 109, 308, '2026-04-15 16:08:52.754776') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1319, 109, 309, '2026-04-15 16:08:52.755217') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1320, 109, 322, '2026-04-15 16:08:52.755521') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1321, 109, 323, '2026-04-15 16:08:52.755709') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1322, 109, 324, '2026-04-15 16:08:52.755875') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1323, 109, 325, '2026-04-15 16:08:52.756022') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1324, 109, 326, '2026-04-15 16:08:52.756163') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1325, 109, 327, '2026-04-15 16:08:52.756302') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1326, 109, 328, '2026-04-15 16:08:52.756644') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1327, 109, 329, '2026-04-15 16:08:52.756918') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1328, 109, 362, '2026-04-15 16:08:52.757126') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1329, 109, 363, '2026-04-15 16:08:52.758524') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1330, 109, 364, '2026-04-15 16:08:52.758757') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1331, 109, 365, '2026-04-15 16:08:52.7589') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1332, 109, 366, '2026-04-15 16:08:52.759032') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1333, 109, 367, '2026-04-15 16:08:52.759159') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1334, 109, 368, '2026-04-15 16:08:52.759288') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1335, 109, 369, '2026-04-15 16:08:52.759413') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1336, 109, 370, '2026-04-15 16:08:52.759538') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1337, 109, 373, '2026-04-15 16:08:52.75966') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1338, 109, 374, '2026-04-15 16:08:52.759783') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1339, 109, 375, '2026-04-15 16:08:52.759982') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1340, 109, 376, '2026-04-15 16:08:52.760184') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1341, 109, 377, '2026-04-15 16:08:52.76063') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1342, 109, 378, '2026-04-15 16:08:52.760866') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1343, 109, 379, '2026-04-15 16:08:52.761005') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1344, 109, 380, '2026-04-15 16:08:52.761135') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1345, 109, 381, '2026-04-15 16:08:52.761266') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1346, 109, 382, '2026-04-15 16:08:52.761396') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1347, 109, 383, '2026-04-15 16:08:52.761522') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1348, 109, 384, '2026-04-15 16:08:52.761649') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1349, 109, 385, '2026-04-15 16:08:52.761785') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1350, 109, 386, '2026-04-15 16:08:52.761921') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1351, 109, 387, '2026-04-15 16:08:52.762058') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1352, 109, 388, '2026-04-15 16:08:52.76219') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1353, 109, 389, '2026-04-15 16:08:52.762323') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1354, 109, 390, '2026-04-15 16:08:52.762461') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1355, 109, 391, '2026-04-15 16:08:52.762598') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1356, 109, 392, '2026-04-15 16:08:52.762726') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1357, 109, 393, '2026-04-15 16:08:52.762855') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1358, 109, 394, '2026-04-15 16:08:52.762987') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1359, 109, 395, '2026-04-15 16:08:52.763244') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1360, 109, 396, '2026-04-15 16:08:52.763574') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1361, 109, 397, '2026-04-15 16:08:52.763783') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1362, 109, 398, '2026-04-15 16:08:52.764105') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1363, 109, 399, '2026-04-15 16:08:52.76483') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1364, 109, 400, '2026-04-15 16:08:52.765351') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1365, 109, 401, '2026-04-15 16:08:52.765643') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1366, 109, 402, '2026-04-15 16:08:52.765832') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1367, 109, 403, '2026-04-15 16:08:52.766185') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1368, 109, 404, '2026-04-15 16:08:52.766739') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1369, 109, 405, '2026-04-15 16:08:52.767485') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1370, 109, 406, '2026-04-15 16:08:52.768117') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1371, 109, 407, '2026-04-15 16:08:52.768693') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1372, 109, 408, '2026-04-15 16:08:52.76902') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1373, 109, 409, '2026-04-15 16:08:52.769194') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1374, 109, 410, '2026-04-15 16:08:52.76935') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1375, 109, 411, '2026-04-15 16:08:52.769489') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1376, 109, 412, '2026-04-15 16:08:52.769628') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1377, 109, 413, '2026-04-15 16:08:52.769764') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1378, 109, 414, '2026-04-15 16:08:52.769898') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1379, 109, 415, '2026-04-15 16:08:52.770082') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1380, 109, 416, '2026-04-15 16:08:52.770224') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1381, 109, 417, '2026-04-15 16:08:52.770355') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1382, 109, 418, '2026-04-15 16:08:52.770482') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1383, 109, 419, '2026-04-15 16:08:52.77061') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1384, 109, 420, '2026-04-15 16:08:52.770736') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1385, 109, 421, '2026-04-15 16:08:52.770865') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1386, 109, 422, '2026-04-15 16:08:52.771003') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1387, 109, 423, '2026-04-15 16:08:52.771148') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1388, 113, 424, '2026-04-15 16:08:52.792468') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1389, 113, 425, '2026-04-15 16:08:52.792799') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1390, 113, 426, '2026-04-15 16:08:52.793049') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1391, 113, 427, '2026-04-15 16:08:52.793425') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1392, 113, 428, '2026-04-15 16:08:52.793685') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1393, 113, 429, '2026-04-15 16:08:52.79383') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1394, 113, 430, '2026-04-15 16:08:52.793969') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1395, 113, 431, '2026-04-15 16:08:52.794103') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1396, 113, 432, '2026-04-15 16:08:52.794234') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1397, 113, 433, '2026-04-15 16:08:52.794364') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1398, 113, 434, '2026-04-15 16:08:52.794492') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1399, 113, 435, '2026-04-15 16:08:52.794625') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1400, 113, 436, '2026-04-15 16:08:52.794763') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1401, 113, 437, '2026-04-15 16:08:52.794907') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1402, 113, 438, '2026-04-15 16:08:52.795057') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1403, 113, 439, '2026-04-15 16:08:52.795212') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1404, 113, 440, '2026-04-15 16:08:52.795506') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1405, 113, 441, '2026-04-15 16:08:52.796048') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1406, 113, 444, '2026-04-15 16:08:52.796485') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1407, 113, 445, '2026-04-15 16:08:52.796924') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1408, 113, 446, '2026-04-15 16:08:52.797193') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1409, 113, 447, '2026-04-15 16:08:52.797365') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1410, 113, 448, '2026-04-15 16:08:52.79753') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1411, 113, 449, '2026-04-15 16:08:52.797686') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1412, 113, 450, '2026-04-15 16:08:52.797896') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1413, 113, 451, '2026-04-15 16:08:52.798056') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1414, 113, 452, '2026-04-15 16:08:52.798198') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1415, 113, 253, '2026-04-15 16:08:52.798332') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1416, 113, 254, '2026-04-15 16:08:52.798469') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1417, 113, 255, '2026-04-15 16:08:52.798618') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1418, 113, 256, '2026-04-15 16:08:52.798775') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1419, 113, 257, '2026-04-15 16:08:52.798974') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1420, 113, 258, '2026-04-15 16:08:52.799112') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1421, 113, 259, '2026-04-15 16:08:52.799659') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1422, 113, 260, '2026-04-15 16:08:52.800395') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1423, 113, 261, '2026-04-15 16:08:52.800978') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1424, 113, 262, '2026-04-15 16:08:52.801463') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1425, 113, 263, '2026-04-15 16:08:52.802165') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1426, 113, 264, '2026-04-15 16:08:52.802737') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1427, 113, 265, '2026-04-15 16:08:52.803243') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1428, 113, 266, '2026-04-15 16:08:52.803484') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1429, 113, 267, '2026-04-15 16:08:52.803661') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1430, 113, 278, '2026-04-15 16:08:52.803844') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1431, 113, 279, '2026-04-15 16:08:52.804002') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1432, 113, 280, '2026-04-15 16:08:52.804154') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1433, 113, 281, '2026-04-15 16:08:52.804968') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1434, 113, 282, '2026-04-15 16:08:52.805344') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1435, 113, 283, '2026-04-15 16:08:52.805564') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1436, 113, 284, '2026-04-15 16:08:52.805748') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1437, 113, 286, '2026-04-15 16:08:52.805963') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1438, 113, 287, '2026-04-15 16:08:52.80612') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1439, 113, 288, '2026-04-15 16:08:52.806288') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1440, 113, 289, '2026-04-15 16:08:52.806414') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1441, 113, 290, '2026-04-15 16:08:52.806538') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1442, 113, 291, '2026-04-15 16:08:52.806754') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1443, 113, 292, '2026-04-15 16:08:52.807007') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1444, 113, 293, '2026-04-15 16:08:52.80722') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1445, 113, 294, '2026-04-15 16:08:52.807417') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1446, 113, 296, '2026-04-15 16:08:52.807609') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1447, 113, 297, '2026-04-15 16:08:52.807797') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1448, 113, 298, '2026-04-15 16:08:52.80793') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1449, 113, 299, '2026-04-15 16:08:52.808057') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1450, 113, 300, '2026-04-15 16:08:52.808193') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1451, 113, 302, '2026-04-15 16:08:52.80832') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1452, 113, 303, '2026-04-15 16:08:52.808448') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1453, 113, 304, '2026-04-15 16:08:52.808666') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1454, 113, 305, '2026-04-15 16:08:52.808833') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1455, 113, 307, '2026-04-15 16:08:52.809021') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1456, 113, 308, '2026-04-15 16:08:52.809162') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1457, 113, 309, '2026-04-15 16:08:52.809295') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1458, 113, 322, '2026-04-15 16:08:52.809428') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1459, 113, 323, '2026-04-15 16:08:52.809557') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1460, 113, 324, '2026-04-15 16:08:52.809688') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1461, 113, 325, '2026-04-15 16:08:52.809821') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1462, 113, 326, '2026-04-15 16:08:52.809951') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1463, 113, 327, '2026-04-15 16:08:52.810083') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1464, 113, 328, '2026-04-15 16:08:52.810268') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1465, 113, 329, '2026-04-15 16:08:52.810437') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1466, 113, 362, '2026-04-15 16:08:52.810573') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1467, 113, 363, '2026-04-15 16:08:52.810716') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1468, 113, 364, '2026-04-15 16:08:52.810854') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1469, 113, 365, '2026-04-15 16:08:52.811037') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1470, 113, 366, '2026-04-15 16:08:52.81129') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1471, 113, 367, '2026-04-15 16:08:52.811652') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1472, 113, 368, '2026-04-15 16:08:52.811858') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1473, 113, 369, '2026-04-15 16:08:52.812164') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1474, 113, 370, '2026-04-15 16:08:52.812477') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1475, 113, 373, '2026-04-15 16:08:52.812678') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1476, 113, 374, '2026-04-15 16:08:52.81291') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1477, 113, 375, '2026-04-15 16:08:52.813115') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1478, 113, 376, '2026-04-15 16:08:52.813262') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1479, 113, 377, '2026-04-15 16:08:52.813401') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1480, 113, 378, '2026-04-15 16:08:52.813549') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1481, 113, 379, '2026-04-15 16:08:52.813698') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1482, 113, 380, '2026-04-15 16:08:52.813837') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1483, 113, 381, '2026-04-15 16:08:52.813979') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1484, 113, 382, '2026-04-15 16:08:52.814113') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1485, 113, 383, '2026-04-15 16:08:52.814249') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1486, 113, 384, '2026-04-15 16:08:52.814387') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1487, 113, 385, '2026-04-15 16:08:52.814522') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1488, 113, 386, '2026-04-15 16:08:52.814654') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1489, 113, 387, '2026-04-15 16:08:52.814792') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1490, 113, 388, '2026-04-15 16:08:52.814941') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1491, 113, 389, '2026-04-15 16:08:52.815384') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1492, 113, 390, '2026-04-15 16:08:52.815562') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1493, 113, 391, '2026-04-15 16:08:52.815728') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1494, 113, 392, '2026-04-15 16:08:52.816229') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1495, 113, 393, '2026-04-15 16:08:52.817107') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1496, 113, 394, '2026-04-15 16:08:52.817833') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1497, 113, 395, '2026-04-15 16:08:52.818534') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1498, 113, 396, '2026-04-15 16:08:52.818977') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1499, 113, 397, '2026-04-15 16:08:52.819211') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1500, 113, 398, '2026-04-15 16:08:52.819423') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1501, 113, 399, '2026-04-15 16:08:52.819583') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1502, 113, 400, '2026-04-15 16:08:52.819937') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1503, 113, 401, '2026-04-15 16:08:52.820186') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1504, 113, 402, '2026-04-15 16:08:52.820427') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1505, 113, 403, '2026-04-15 16:08:52.820697') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1506, 113, 404, '2026-04-15 16:08:52.820886') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1507, 113, 405, '2026-04-15 16:08:52.821231') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1508, 113, 406, '2026-04-15 16:08:52.821399') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1509, 113, 407, '2026-04-15 16:08:52.821595') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1510, 113, 408, '2026-04-15 16:08:52.821854') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1511, 113, 409, '2026-04-15 16:08:52.822008') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1512, 113, 410, '2026-04-15 16:08:52.822274') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1513, 113, 411, '2026-04-15 16:08:52.822447') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1514, 113, 412, '2026-04-15 16:08:52.822656') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1515, 113, 413, '2026-04-15 16:08:52.822934') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1516, 113, 414, '2026-04-15 16:08:52.823186') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1517, 113, 415, '2026-04-15 16:08:52.82338') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1518, 113, 416, '2026-04-15 16:08:52.823524') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1519, 113, 417, '2026-04-15 16:08:52.823658') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1520, 113, 418, '2026-04-15 16:08:52.823787') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1521, 113, 419, '2026-04-15 16:08:52.823913') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1522, 113, 420, '2026-04-15 16:08:52.824041') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1523, 113, 421, '2026-04-15 16:08:52.824171') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1524, 113, 422, '2026-04-15 16:08:52.824299') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1525, 113, 423, '2026-04-15 16:08:52.824427') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1526, 114, 424, '2026-04-15 16:08:52.825586') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1527, 114, 425, '2026-04-15 16:08:52.825823') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1528, 114, 426, '2026-04-15 16:08:52.825986') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1529, 114, 427, '2026-04-15 16:08:52.826241') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1530, 114, 428, '2026-04-15 16:08:52.82646') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1531, 114, 429, '2026-04-15 16:08:52.826672') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1532, 114, 430, '2026-04-15 16:08:52.82685') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1533, 114, 431, '2026-04-15 16:08:52.827017') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1534, 114, 432, '2026-04-15 16:08:52.827311') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1535, 114, 433, '2026-04-15 16:08:52.827506') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1536, 114, 434, '2026-04-15 16:08:52.827659') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1537, 114, 435, '2026-04-15 16:08:52.827813') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1538, 114, 436, '2026-04-15 16:08:52.827957') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1539, 114, 437, '2026-04-15 16:08:52.82811') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1540, 114, 438, '2026-04-15 16:08:52.828256') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1541, 114, 439, '2026-04-15 16:08:52.82843') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1542, 114, 440, '2026-04-15 16:08:52.828751') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1543, 114, 441, '2026-04-15 16:08:52.829337') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1544, 114, 444, '2026-04-15 16:08:52.829738') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1545, 114, 445, '2026-04-15 16:08:52.830186') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1546, 114, 446, '2026-04-15 16:08:52.830513') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1547, 114, 447, '2026-04-15 16:08:52.830774') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1548, 114, 448, '2026-04-15 16:08:52.830962') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1549, 114, 449, '2026-04-15 16:08:52.831185') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1550, 114, 450, '2026-04-15 16:08:52.831414') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1551, 114, 451, '2026-04-15 16:08:52.831633') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1552, 114, 452, '2026-04-15 16:08:52.831856') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1553, 114, 253, '2026-04-15 16:08:52.832051') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1554, 114, 254, '2026-04-15 16:08:52.832191') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1555, 114, 255, '2026-04-15 16:08:52.832366') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1556, 114, 256, '2026-04-15 16:08:52.833313') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1557, 114, 257, '2026-04-15 16:08:52.834299') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1558, 114, 258, '2026-04-15 16:08:52.835422') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1559, 114, 259, '2026-04-15 16:08:52.836644') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1560, 114, 260, '2026-04-15 16:08:52.837628') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1561, 114, 261, '2026-04-15 16:08:52.838222') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1562, 114, 262, '2026-04-15 16:08:52.839187') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1563, 114, 263, '2026-04-15 16:08:52.839656') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1564, 114, 264, '2026-04-15 16:08:52.839909') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1565, 114, 265, '2026-04-15 16:08:52.840076') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1566, 114, 266, '2026-04-15 16:08:52.840271') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1567, 114, 267, '2026-04-15 16:08:52.84051') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1568, 114, 278, '2026-04-15 16:08:52.840818') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1569, 114, 279, '2026-04-15 16:08:52.841091') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1570, 114, 280, '2026-04-15 16:08:52.84127') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1571, 114, 281, '2026-04-15 16:08:52.841409') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1572, 114, 282, '2026-04-15 16:08:52.841539') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1573, 114, 283, '2026-04-15 16:08:52.841715') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1574, 114, 284, '2026-04-15 16:08:52.841846') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1575, 114, 286, '2026-04-15 16:08:52.841969') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1576, 114, 287, '2026-04-15 16:08:52.842093') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1577, 114, 288, '2026-04-15 16:08:52.842215') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1578, 114, 289, '2026-04-15 16:08:52.842334') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1579, 114, 290, '2026-04-15 16:08:52.842452') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1580, 114, 291, '2026-04-15 16:08:52.84257') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1581, 114, 292, '2026-04-15 16:08:52.842688') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1582, 114, 293, '2026-04-15 16:08:52.842805') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1583, 114, 294, '2026-04-15 16:08:52.842921') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1584, 114, 296, '2026-04-15 16:08:52.843039') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1585, 114, 297, '2026-04-15 16:08:52.843156') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1586, 114, 298, '2026-04-15 16:08:52.843273') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1587, 114, 299, '2026-04-15 16:08:52.843614') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1588, 114, 300, '2026-04-15 16:08:52.843761') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1589, 114, 302, '2026-04-15 16:08:52.843883') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1590, 114, 303, '2026-04-15 16:08:52.84402') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1591, 114, 304, '2026-04-15 16:08:52.844283') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1592, 114, 305, '2026-04-15 16:08:52.844493') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1593, 114, 307, '2026-04-15 16:08:52.844669') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1594, 114, 308, '2026-04-15 16:08:52.845057') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1595, 114, 309, '2026-04-15 16:08:52.845294') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1596, 114, 322, '2026-04-15 16:08:52.845429') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1597, 114, 323, '2026-04-15 16:08:52.845554') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1598, 114, 324, '2026-04-15 16:08:52.845676') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1599, 114, 325, '2026-04-15 16:08:52.845797') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1600, 114, 326, '2026-04-15 16:08:52.845917') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1601, 114, 327, '2026-04-15 16:08:52.846037') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1602, 114, 328, '2026-04-15 16:08:52.84627') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1603, 114, 329, '2026-04-15 16:08:52.846412') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1604, 114, 362, '2026-04-15 16:08:52.846544') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1605, 114, 363, '2026-04-15 16:08:52.846686') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1606, 114, 364, '2026-04-15 16:08:52.846854') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1607, 114, 365, '2026-04-15 16:08:52.847105') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1608, 114, 366, '2026-04-15 16:08:52.847319') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1609, 114, 367, '2026-04-15 16:08:52.847585') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1610, 114, 368, '2026-04-15 16:08:52.84785') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1611, 114, 369, '2026-04-15 16:08:52.849004') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1612, 114, 370, '2026-04-15 16:08:52.850663') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1613, 114, 373, '2026-04-15 16:08:52.852018') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1614, 114, 374, '2026-04-15 16:08:52.853272') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1615, 114, 375, '2026-04-15 16:08:52.854516') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1616, 114, 376, '2026-04-15 16:08:52.855736') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1617, 114, 377, '2026-04-15 16:08:52.856359') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1618, 114, 378, '2026-04-15 16:08:52.856741') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1619, 114, 379, '2026-04-15 16:08:52.857467') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1620, 114, 380, '2026-04-15 16:08:52.858062') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1621, 114, 381, '2026-04-15 16:08:52.858765') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1622, 114, 382, '2026-04-15 16:08:52.859261') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1623, 114, 383, '2026-04-15 16:08:52.859866') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1624, 114, 384, '2026-04-15 16:08:52.860669') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1625, 114, 385, '2026-04-15 16:08:52.861089') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1626, 114, 386, '2026-04-15 16:08:52.861311') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1627, 114, 387, '2026-04-15 16:08:52.861464') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1628, 114, 388, '2026-04-15 16:08:52.861603') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1629, 114, 389, '2026-04-15 16:08:52.861734') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1630, 114, 390, '2026-04-15 16:08:52.861866') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1631, 114, 391, '2026-04-15 16:08:52.861991') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1632, 114, 392, '2026-04-15 16:08:52.862116') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1633, 114, 393, '2026-04-15 16:08:52.862239') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1634, 114, 394, '2026-04-15 16:08:52.862363') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1635, 114, 395, '2026-04-15 16:08:52.862487') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1636, 114, 396, '2026-04-15 16:08:52.862609') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1637, 114, 397, '2026-04-15 16:08:52.862729') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1638, 114, 398, '2026-04-15 16:08:52.862869') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1639, 114, 399, '2026-04-15 16:08:52.863064') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1640, 114, 400, '2026-04-15 16:08:52.863196') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1641, 114, 401, '2026-04-15 16:08:52.863314') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1642, 114, 402, '2026-04-15 16:08:52.863429') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1643, 114, 403, '2026-04-15 16:08:52.863544') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1644, 114, 404, '2026-04-15 16:08:52.86366') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1645, 114, 405, '2026-04-15 16:08:52.863775') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1646, 114, 406, '2026-04-15 16:08:52.863895') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1647, 114, 407, '2026-04-15 16:08:52.864015') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1648, 114, 408, '2026-04-15 16:08:52.864136') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1649, 114, 409, '2026-04-15 16:08:52.864253') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1650, 114, 410, '2026-04-15 16:08:52.86437') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1651, 114, 411, '2026-04-15 16:08:52.864485') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1652, 114, 412, '2026-04-15 16:08:52.864602') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1653, 114, 413, '2026-04-15 16:08:52.864718') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1654, 114, 414, '2026-04-15 16:08:52.864832') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1655, 114, 415, '2026-04-15 16:08:52.864997') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1656, 114, 416, '2026-04-15 16:08:52.865122') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1657, 114, 417, '2026-04-15 16:08:52.865238') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1658, 114, 418, '2026-04-15 16:08:52.865354') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1659, 114, 419, '2026-04-15 16:08:52.865481') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1660, 114, 420, '2026-04-15 16:08:52.865635') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1661, 114, 421, '2026-04-15 16:08:52.86576') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1662, 114, 422, '2026-04-15 16:08:52.866203') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (1663, 114, 423, '2026-04-15 16:08:52.866673') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3197, 130, 763, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3198, 130, 764, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3199, 130, 765, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3200, 130, 766, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3201, 130, 767, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3202, 130, 768, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3203, 130, 770, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3204, 130, 771, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3205, 130, 784, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3206, 130, 785, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3207, 130, 786, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3208, 130, 787, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3209, 130, 788, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3210, 130, 789, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3211, 130, 790, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3212, 130, 791, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3213, 130, 792, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3214, 130, 793, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3215, 130, 794, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3216, 130, 796, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3217, 130, 797, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3218, 130, 798, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3219, 130, 799, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3220, 130, 800, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3221, 130, 801, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3222, 130, 802, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3223, 130, 803, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3224, 130, 804, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3225, 130, 805, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3226, 130, 806, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3227, 130, 807, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3228, 130, 808, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3229, 130, 809, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3230, 130, 810, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3231, 130, 811, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3232, 130, 812, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;
INSERT INTO public.company_module_field_selection VALUES (3233, 130, 813, '2026-04-27 12:41:44.584594') ON CONFLICT DO NOTHING;


--
-- TOC entry 5498 (class 0 OID 20355)
-- Dependencies: 236
-- Data for Name: company_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.company_modules VALUES (109, 100, 6, 1, '2026-04-11 17:38:02.764839', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-11 17:38:02.764839', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (108, 100, 6, 1, '2026-04-11 17:35:13.065365', 1, NULL, NULL, NULL, 1, 'Sharjah', '2026-04-11 17:35:13.065365', 2, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (113, 102, 6, 1, '2026-04-15 16:08:52.771816', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-15 16:08:52.771816', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (114, 103, 6, 1, '2026-04-15 16:08:52.824882', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-15 16:08:52.824882', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (89, 85, 1, 1, '2026-04-06 13:07:58.116538', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 13:07:58.116538', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (90, 85, 2, 1, '2026-04-06 13:07:58.116538', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 13:07:58.116538', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (91, 85, 3, 1, '2026-04-06 13:07:58.116538', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 13:07:58.116538', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (92, 85, 4, 1, '2026-04-06 13:07:58.116538', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 13:07:58.116538', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (93, 85, 5, 1, '2026-04-06 13:07:58.116538', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 13:07:58.116538', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (94, 85, 6, 1, '2026-04-06 13:07:58.116538', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 13:07:58.116538', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (16, 2, 2, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.563821', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (17, 2, 5, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.564209', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (18, 2, 1, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.564572', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (19, 2, 3, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.564832', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (20, 2, 4, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.565051', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (21, 2, 6, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.565254', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (22, 2, 9, 1, '2026-01-26 13:43:02', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-06 12:40:17.565464', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (116, 1, 6, 1, '2026-04-20 12:14:05.432213', NULL, NULL, NULL, NULL, 1, NULL, '2026-04-20 12:14:05.432213', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (115, 1, 6, 1, '2026-04-16 12:41:02.18429', 1, NULL, NULL, NULL, 1, 'All', '2026-04-16 12:41:02.18429', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (129, 1, 13, 1, '2026-04-25 12:46:17.708653', 1, NULL, NULL, NULL, 1, 'All', '2026-04-25 12:46:17.708653', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (130, 1, 14, 1, '2026-04-27 10:49:09.686525', 1, NULL, NULL, NULL, 1, 'All', '2026-04-27 10:49:09.686525', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (131, 1, 12, 1, '2026-04-27 15:13:36.555625', 1, NULL, NULL, NULL, 1, 'Abu Dhabi', '2026-04-27 15:13:36.555625', 2, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (132, 1, 14, 1, '2026-04-27 15:53:39.865646', 1, NULL, NULL, NULL, 1, 'All', '2026-04-27 15:53:39.865646', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.company_modules VALUES (128, 1, 12, 1, '2026-04-24 11:28:49.12377', 1, NULL, NULL, NULL, 1, 'All', '2026-04-24 11:28:49.12377', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5500 (class 0 OID 20369)
-- Dependencies: 238
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.countries VALUES (2, 'India') ON CONFLICT DO NOTHING;
INSERT INTO public.countries VALUES (1, 'UAE') ON CONFLICT DO NOTHING;
INSERT INTO public.countries VALUES (3, 'All') ON CONFLICT DO NOTHING;


--
-- TOC entry 5502 (class 0 OID 20378)
-- Dependencies: 240
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.departments VALUES (3, 2, 'Electronics', 'ELEC') ON CONFLICT DO NOTHING;


--
-- TOC entry 5504 (class 0 OID 20388)
-- Dependencies: 242
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.employees VALUES (40, 81, NULL, NULL, 'ii', 'vishnupriyaashish9624@gmail.com', '67678', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (43, 86, NULL, NULL, 'ram', '', '', 'Employee', '2026-03-09 14:41:15.568564') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (44, 86, NULL, NULL, 'Liya', '', '', 'Employee', '2026-03-09 14:57:20.021729') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (45, 12, NULL, NULL, 'john', '', '', 'Employee', '2026-04-06 09:47:50.40393') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (3, 2, 3, 'TS001', 'Bob Wilson', 'bob@techsol.com', NULL, 'Technician', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (6, 16, NULL, '', 'naina', '', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (9, 18, NULL, '', 'john', '', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (10, 16, NULL, '', 'Sameer', 'Sameer@gmail.com', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (12, 5, NULL, '', 'Anwer', '', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (13, 5, NULL, '', 'Meera', '', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (14, 31, NULL, '', 'john', '', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (15, 2, NULL, '', 'mira', '', '', '', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (16, 74, NULL, NULL, 'miran', 'vishnupriyaashish9624@gmail.com', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (17, 77, NULL, NULL, 'Dora', 'vishnupriya312@gmail.com', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (18, 78, NULL, NULL, 'John Doe', 'john.doe@hynccvcv.com', '+971 50 123 4567', 'Manager', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (19, 78, NULL, NULL, 'Jane Smith', 'jane.smith@hynccvcv.com', '+971 50 234 5678', 'Supervisor', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (20, 78, NULL, NULL, 'Robert Brown', 'robert.b@hynccvcv.com', '+971 50 345 6789', 'Technician', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (21, 81, NULL, NULL, 'jo', 'vishnupriya312@gmail.com', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (22, 82, NULL, NULL, 'milan', '', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (23, 82, NULL, NULL, 'milan', '', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (24, 81, NULL, NULL, 'john ', '', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (25, 82, NULL, NULL, 'jj', '', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (26, 81, NULL, NULL, 'john ', 'john@gmail.com', '9999', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (27, 82, NULL, NULL, 'jj', 'yy', '7889', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (28, 82, NULL, NULL, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '9999', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (29, 82, NULL, NULL, 'dsrestr', 'ew@fdtf.com', '56457645', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (30, 82, NULL, NULL, 'rtre', 'ds@etet.com', '5656', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (31, 82, NULL, NULL, 'John Smith', 'rincy@nurac.com', '45345', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (32, 82, NULL, NULL, 'test', 'AlexJohnson@267', '45r54', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (33, 82, NULL, NULL, 'i8686', '', '', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (34, 81, NULL, NULL, 'kkkk', 'vishnupriyaashish9624@gmail.com', '89888', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (35, 69, NULL, NULL, 'jojj', 'vishnupriyaashish9624@gmail.com', 'i787978', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (36, 82, NULL, NULL, 'miya ', 'vishnupriyaashish9624@gmail.com', '99', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (37, 81, NULL, NULL, 'kk', 'vishnupriyaashish9624@gmail.com', '78878', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (39, 81, NULL, NULL, 'hridhya', 'vishnupriyaashish9624@gmail.com', '9809098', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (38, 81, NULL, NULL, 'siyan ', 'vishnupriyaashish9624@gmail.com', '676877y67', 'Employee', '2026-02-20 12:59:13.866845') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (57, 101, NULL, NULL, 'yyy', '', '', 'Employee', '2026-04-12 10:49:48.16557') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (66, 102, NULL, NULL, 'Anna', 'vishnupriyaashish9624@gmail.com', '', 'Employee', '2026-04-12 12:19:00.350494') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (58, 101, NULL, NULL, 'jjj', '', '', 'Employee', '2026-04-12 10:52:03.78939') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (67, 103, NULL, NULL, 'Anna', 'vishnupriyaashish9624@gmail.com', '', 'Employee', '2026-04-12 12:19:23.094465') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (59, 101, NULL, NULL, 'kkk', 'john.smith@email.com', '', 'Employee', '2026-04-12 11:00:31.151505') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (56, 101, NULL, NULL, 'Anna', 'vishnupriyaashish9624@gmail.com', '', 'Employee', '2026-04-11 17:27:36.422016') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (60, 102, NULL, NULL, 'kkk', 'john.smith@email.com', NULL, 'Employee', '2026-04-12 11:23:32.608731') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (63, 101, NULL, NULL, ',okok', 'nuroilsocial@gmail.com', '', 'Employee', '2026-04-12 12:08:06.170902') ON CONFLICT DO NOTHING;
INSERT INTO public.employees VALUES (64, 102, NULL, NULL, ',okok', 'nuroilsocial@gmail.com', '', 'Employee', '2026-04-12 12:08:06.170902') ON CONFLICT DO NOTHING;


--
-- TOC entry 5506 (class 0 OID 20400)
-- Dependencies: 244
-- Data for Name: maintenance_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5508 (class 0 OID 20418)
-- Dependencies: 246
-- Data for Name: module_heads; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5510 (class 0 OID 20433)
-- Dependencies: 248
-- Data for Name: module_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.module_master VALUES (1, 'Premises', 1, '2026-01-26 08:03:08', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (2, 'Assets', 1, '2026-01-26 08:03:08', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (3, 'Employees', 1, '2026-01-26 08:03:08', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (6, 'Vehicle', 1, '2026-02-11 12:41:17.656', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (12, 'Vehicle Details', 1, '2026-04-23 10:00:11.261106', 6) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (13, 'Vehicle Insurance', 1, '2026-04-23 10:00:31.739011', 6) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (14, 'Vehicle Purchase', 1, '2026-04-23 10:00:54.59513', 6) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (4, 'Employee Directory', 1, '2026-04-24 11:26:35.543354', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (5, 'Asset Categories', 1, '2026-04-24 11:26:35.547127', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (9, 'Settings', 1, '2026-04-24 11:26:35.54863', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_master VALUES (16, 'Asset Request', 1, '2026-04-28 11:49:18.65101', 2) ON CONFLICT DO NOTHING;


--
-- TOC entry 5512 (class 0 OID 20445)
-- Dependencies: 250
-- Data for Name: module_section_field_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.module_section_field_options VALUES (192, 535, 'Routine', 'ROUTINE', 0, '2026-04-16 14:46:29.475405') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (193, 535, 'Repair', 'REPAIR', 1, '2026-04-16 14:46:29.477329') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (194, 535, 'Maintenance', 'MAINTENANCE', 2, '2026-04-16 14:46:29.478453') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (195, 535, 'Emergency', 'EMERGENCY', 3, '2026-04-16 14:46:29.479079') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (196, 535, 'Inspection', 'INSPECTION', 4, '2026-04-16 14:46:29.479775') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (197, 540, 'General Service', 'GENERAL_SERVICE', 0, '2026-04-16 14:46:29.482173') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (198, 540, 'Oil & Filter Change', 'OIL_&_FILTER_CHANGE', 1, '2026-04-16 14:46:29.482638') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (199, 540, 'Brake Pad Replacement', 'BRAKE_PAD_REPLACEMENT', 2, '2026-04-16 14:46:29.482946') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (200, 540, 'Tyre Rotation/Change', 'TYRE_ROTATION/CHANGE', 3, '2026-04-16 14:46:29.483172') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (201, 540, 'A/C Service', 'A/C_SERVICE', 4, '2026-04-16 14:46:29.483369') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (202, 540, 'Engine Tuning', 'ENGINE_TUNING', 5, '2026-04-16 14:46:29.48355') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (203, 540, 'Battery Replacement', 'BATTERY_REPLACEMENT', 6, '2026-04-16 14:46:29.483731') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (220, 469, 'Petrol', 'PETROL', 0, '2026-04-16 15:24:35.941591') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (221, 469, 'Diesel', 'DIESEL', 1, '2026-04-16 15:24:35.942669') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (222, 469, 'Electric', 'ELECTRIC', 2, '2026-04-16 15:24:35.943351') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (223, 469, 'Hybrid', 'HYBRID', 3, '2026-04-16 15:24:35.944076') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (224, 469, 'LPG', 'LPG', 4, '2026-04-16 15:24:35.945036') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (225, 470, 'Manual', 'MANUAL', 0, '2026-04-16 15:24:35.947669') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (226, 470, 'Automatic', 'AUTOMATIC', 1, '2026-04-16 15:24:35.94822') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (227, 455, 'Company', 'COMPANY', 0, '2026-04-16 15:24:35.949945') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (228, 455, 'Personal', 'PERSONAL', 1, '2026-04-16 15:24:35.950179') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (229, 459, 'Passenger', 'PASSENGER', 0, '2026-04-16 15:24:35.951678') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (230, 459, 'Cargo', 'CARGO', 1, '2026-04-16 15:24:35.952052') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (231, 459, 'Chiller cargo', 'CHILLER_CARGO', 2, '2026-04-16 15:24:35.952545') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (232, 604, 'Active', 'ACTIVE', 0, '2026-04-16 15:24:35.955757') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (233, 604, 'Maintenance', 'MAINTENANCE', 1, '2026-04-16 15:24:35.956103') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (234, 604, 'Sold', 'SOLD', 2, '2026-04-16 15:24:35.956502') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (235, 604, 'Inactive', 'INACTIVE', 3, '2026-04-16 15:24:35.956844') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (236, 517, 'Comprehensive', 'COMPREHENSIVE', 0, '2026-04-16 15:24:35.958329') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (237, 517, 'Third Party', 'THIRD_PARTY', 1, '2026-04-16 15:24:35.958706') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (238, 523, 'Active', 'ACTIVE', 0, '2026-04-16 15:24:35.959831') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (239, 523, 'Expired', 'EXPIRED', 1, '2026-04-16 15:24:35.960056') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (240, 523, 'Renewed', 'RENEWED', 2, '2026-04-16 15:24:35.960252') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (241, 503, 'Active', 'ACTIVE', 0, '2026-04-16 15:24:35.962017') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (242, 503, 'Expired', 'EXPIRED', 1, '2026-04-16 15:24:35.962376') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (243, 503, 'Pending Renewal', 'PENDING_RENEWAL', 2, '2026-04-16 15:24:35.96258') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (244, 512, 'Active', 'ACTIVE', 0, '2026-04-16 15:24:35.963635') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (245, 512, 'Expired', 'EXPIRED', 1, '2026-04-16 15:24:35.963959') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (246, 512, 'Cancelled', 'CANCELLED', 2, '2026-04-16 15:24:35.964186') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (247, 556, 'Cash', 'CASH', 0, '2026-04-16 15:24:35.965146') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (248, 556, 'Bank', 'BANK', 1, '2026-04-16 15:24:35.965374') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (249, 556, 'Card', 'CARD', 2, '2026-04-16 15:24:35.965658') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (250, 557, 'Draft', 'DRAFT', 0, '2026-04-16 15:24:35.966688') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (251, 557, 'Approved', 'APPROVED', 1, '2026-04-16 15:24:35.966921') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (252, 557, 'Paid', 'PAID', 2, '2026-04-16 15:24:35.967128') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (253, 561, 'Accident', 'ACCIDENT', 0, '2026-04-16 15:24:35.968446') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (254, 561, 'Fine', 'FINE', 1, '2026-04-16 15:24:35.968893') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (255, 561, 'Violation', 'VIOLATION', 2, '2026-04-16 15:24:35.969248') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (256, 561, 'Breakdown', 'BREAKDOWN', 3, '2026-04-16 15:24:35.969612') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (257, 569, 'Open', 'OPEN', 0, '2026-04-16 15:24:35.971064') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (258, 569, 'Submitted', 'SUBMITTED', 1, '2026-04-16 15:24:35.971434') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (259, 569, 'Settled', 'SETTLED', 2, '2026-04-16 15:24:35.971665') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (260, 569, 'NA', 'NA', 3, '2026-04-16 15:24:35.971879') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (261, 529, 'Active', 'ACTIVE', 0, '2026-04-16 15:24:35.972891') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (262, 529, 'Blocked', 'BLOCKED', 1, '2026-04-16 15:24:35.973209') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (263, 529, 'Inactive', 'INACTIVE', 2, '2026-04-16 15:24:35.973747') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (264, 661, 'Van - Cargo', 'VAN_CARGO', 0, '2026-04-17 15:55:52.851423') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (265, 661, 'Pickup', 'PICKUP', 1, '2026-04-17 15:55:52.861849') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (266, 661, 'Pickup - Double Cab', 'PICKUP_DOUBLE_CAB', 2, '2026-04-17 15:55:52.862748') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (267, 661, 'Truck - Light (up to 3.5t)', 'TRUCK_LIGHT_UP_TO_3.5T', 3, '2026-04-17 15:55:52.863757') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (268, 661, 'Truck - Medium (3.5t-10t)', 'TRUCK_MEDIUM_3.5T_10T', 4, '2026-04-17 15:55:52.864791') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (269, 661, 'Truck - Heavy (10t+)', 'TRUCK_HEAVY_10T', 5, '2026-04-17 15:55:52.865494') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (270, 661, 'Chiller Van', 'CHILLER_VAN', 6, '2026-04-17 15:55:52.865961') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (271, 661, 'Chiller Truck', 'CHILLER_TRUCK', 7, '2026-04-17 15:55:52.86626') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (272, 661, 'Flatbed Truck', 'FLATBED_TRUCK', 8, '2026-04-17 15:55:52.866534') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (273, 661, 'Tipper Truck', 'TIPPER_TRUCK', 9, '2026-04-17 15:55:52.866773') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (274, 661, 'Tanker', 'TANKER', 10, '2026-04-17 15:55:52.866971') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (275, 661, 'Container Truck', 'CONTAINER_TRUCK', 11, '2026-04-17 15:55:52.867162') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (276, 661, 'Curtain Side Truck', 'CURTAIN_SIDE_TRUCK', 12, '2026-04-17 15:55:52.867354') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (278, 698, 'Fuel', 'FUEL', 0, '2026-04-17 16:22:08.715106') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (279, 698, 'Maintenance', 'MAINTENANCE', 1, '2026-04-17 16:22:08.716661') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (280, 698, 'Insurance', 'INSURANCE', 2, '2026-04-17 16:22:08.717549') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (281, 698, 'Registration / Mulkiya', 'REGISTRATION__MULKIYA', 3, '2026-04-17 16:22:08.718577') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (282, 698, 'Traffic Fine', 'TRAFFIC_FINE', 4, '2026-04-17 16:22:08.719619') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (283, 698, 'Toll / Salik', 'TOLL__SALIK', 5, '2026-04-17 16:22:08.720272') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (284, 698, 'Tyres', 'TYRES', 6, '2026-04-17 16:22:08.720797') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (285, 698, 'Parking', 'PARKING', 7, '2026-04-17 16:22:08.721276') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (286, 698, 'Cleaning / Wash', 'CLEANING__WASH', 8, '2026-04-17 16:22:08.721684') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (287, 698, 'Other', 'OTHER', 9, '2026-04-17 16:22:08.722083') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (288, 705, 'Salik ', 'salik_', 0, '2026-04-17 17:19:27.087056') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (290, 705, 'Darb', 'darb', 1, '2026-04-17 17:19:27.087056') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (289, 706, 'Yes', 'yes', 0, '2026-04-17 17:19:27.090957') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (291, 706, 'No', 'no', 1, '2026-04-17 17:19:27.090957') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (292, 717, 'Cash', 'cash', 0, '2026-04-17 17:33:26.595523') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (293, 717, 'Bank Finance ', 'bank_finance_', 1, '2026-04-17 17:33:26.595523') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (294, 717, 'Lease', 'lease', 2, '2026-04-17 17:33:26.595523') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (295, 717, 'Company Cheque', 'company_cheque', 3, '2026-04-17 17:33:26.595523') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (296, 717, 'Post Dated Check', 'post_dated_check', 4, '2026-04-17 17:33:26.595523') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (297, 732, 'paid ', 'paid_', 0, '2026-04-18 10:02:08.01034') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (299, 742, 'Comprehensive', 'comprehensive', 0, '2026-04-22 09:53:09.21911') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (300, 742, 'Third Party', 'third_party', 1, '2026-04-22 09:53:09.21911') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (301, 742, 'Third Party + Fire & Theft', 'third_party___fire___theft', 2, '2026-04-22 09:53:09.21911') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (302, 745, 'Yes — Agency repair included', 'yes___agency_repair_included', 0, '2026-04-22 09:53:09.278662') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (303, 745, 'No — Non-agency repair', 'no___non_agency_repair', 1, '2026-04-22 09:53:09.278662') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (304, 751, 'Sedan', 'sedan', 0, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (305, 751, 'SUV', 'suv', 1, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (306, 751, 'Hatchback', 'hatchback', 2, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (307, 751, 'Coupe', 'coupe', 3, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (308, 751, 'MPV Carier', 'mpv_carier', 4, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (309, 751, 'Bus', 'bus', 5, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (310, 751, 'Minibus', 'minibus', 6, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (311, 751, 'Staff Van', 'staff_van', 7, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (312, 751, 'Van -Cargo', 'van__cargo', 8, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (313, 751, 'Pickup', 'pickup', 9, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (314, 751, 'Pickup - Double Cab', 'pickup___double_cab', 10, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (315, 751, 'Truck - Light (up to 3.5t)', 'truck___light__up_to_3_5t_', 11, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (316, 751, 'Truck - Medium (3.5t-10t)', 'truck___medium__3_5t_10t_', 12, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (317, 751, 'Chiller Van', 'chiller_van', 13, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (318, 751, 'Chiller Truck', 'chiller_truck', 14, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (319, 751, 'Flatbed Truck', 'flatbed_truck', 15, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (320, 751, 'Tipper Truck', 'tipper_truck', 16, '2026-04-23 13:00:20.71807') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (321, 759, 'Petrol ', 'petrol_', 0, '2026-04-23 13:03:02.217095') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (322, 759, 'Diesel', 'diesel', 1, '2026-04-23 13:03:02.217095') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (323, 759, 'Electric', 'electric', 2, '2026-04-23 13:03:02.217095') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (324, 759, 'Hybrid', 'hybrid', 3, '2026-04-23 13:03:02.217095') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (325, 759, 'CNG', 'cng', 4, '2026-04-23 13:03:02.217095') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (326, 761, 'Active ', 'active_', 0, '2026-04-23 13:04:17.123016') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (327, 761, 'Inactive', 'inactive', 1, '2026-04-23 13:04:17.123016') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (328, 761, 'In Service', 'in_service', 2, '2026-04-23 13:04:17.123016') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (329, 761, 'Sold', 'sold', 3, '2026-04-23 13:04:17.123016') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (330, 778, 'Comprehensive', 'comprehensive', 0, '2026-04-23 15:03:04.340108') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (331, 780, 'Yes-Agency repair included', 'yes_agency_repair_included', 0, '2026-04-23 15:03:04.349128') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (332, 778, 'Third Party', 'third_party', 1, '2026-04-23 15:03:04.340108') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (333, 780, 'No-Non-agency repair ', 'no_non_agency_repair_', 1, '2026-04-23 15:03:04.349128') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (334, 778, 'Third party +Fire & Theft', 'third_party__fire___theft', 2, '2026-04-23 15:03:04.340108') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (336, 797, 'option 1 ', 'option_1_', 0, '2026-04-27 11:59:24.816852') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (349, 828, 'Bank Finance', 'bank_finance', 0, '2026-04-28 13:03:18.959231') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (350, 828, 'Cash', 'cash', 1, '2026-04-28 13:03:18.959231') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (351, 828, 'Lease', 'lease', 2, '2026-04-28 13:03:18.959231') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (352, 828, 'Company Cheque', 'company_cheque', 3, '2026-04-28 13:03:18.959231') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_field_options VALUES (353, 828, 'PDC (Post-Dated Cheque)', 'pdc__post_dated_cheque_', 4, '2026-04-28 13:03:18.959231') ON CONFLICT DO NOTHING;


--
-- TOC entry 5514 (class 0 OID 20461)
-- Dependencies: 252
-- Data for Name: module_section_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.module_section_fields VALUES (517, 1, 6, 131, 'insurance_type', 'Insurance Type', 'dropdown', NULL, 0, 1, 5, '2026-04-16 13:07:04.684665', '2026-04-16 13:07:04.684665', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (474, 1, 6, 136, 'assignment_id', 'Assignment ID', 'text', NULL, 0, 1, 1, '2026-04-16 12:39:15.131589', '2026-04-16 12:39:15.131589', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (475, 1, 6, 136, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 12:39:15.142505', '2026-04-16 12:39:15.142505', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (476, 1, 6, 136, 'driver_id', 'Driver ID', 'text', NULL, 0, 1, 3, '2026-04-16 12:39:15.1434', '2026-04-16 12:39:15.1434', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (477, 1, 6, 136, 'department_name', 'Department Name', 'text', NULL, 0, 1, 4, '2026-04-16 12:39:15.144117', '2026-04-16 12:39:15.144117', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (478, 1, 6, 136, 'assigned_to_name', 'Assigned To Name', 'text', NULL, 0, 1, 5, '2026-04-16 12:39:15.144826', '2026-04-16 12:39:15.144826', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (479, 1, 6, 136, 'start_date', 'Start Date', 'date', NULL, 0, 1, 6, '2026-04-16 12:39:15.146747', '2026-04-16 12:39:15.146747', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (480, 1, 6, 136, 'end_date', 'End Date', 'date', NULL, 0, 1, 7, '2026-04-16 12:39:15.147843', '2026-04-16 12:39:15.147843', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (482, 1, 6, 135, 'purchase_id', 'Purchase ID', 'text', NULL, 0, 1, 1, '2026-04-16 12:42:53.085873', '2026-04-16 12:42:53.085873', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (483, 1, 6, 135, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 12:42:53.092965', '2026-04-16 12:42:53.092965', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (484, 1, 6, 135, 'purchase_ref_no', 'Purchase Ref No', 'text', NULL, 0, 1, 3, '2026-04-16 12:42:53.094008', '2026-04-16 12:42:53.094008', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (485, 1, 6, 135, 'vendor_id', 'Vendor ID', 'text', NULL, 0, 1, 4, '2026-04-16 12:42:53.09496', '2026-04-16 12:42:53.09496', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (486, 1, 6, 135, 'purchase_date', 'Purchase Date', 'date', NULL, 0, 1, 5, '2026-04-16 12:42:53.096222', '2026-04-16 12:42:53.096222', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (487, 1, 6, 135, 'invoice_no', 'Invoice No', 'text', NULL, 0, 1, 6, '2026-04-16 12:42:53.097203', '2026-04-16 12:42:53.097203', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (496, 1, 6, 133, 'registration_id', 'Registration ID', 'text', NULL, 0, 1, 1, '2026-04-16 12:45:15.346771', '2026-04-16 12:45:15.346771', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (497, 1, 6, 133, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 12:45:15.352804', '2026-04-16 12:45:15.352804', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (498, 1, 6, 133, 'registration_no', 'Registration No', 'text', NULL, 0, 1, 3, '2026-04-16 12:45:15.354626', '2026-04-16 12:45:15.354626', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (499, 1, 6, 133, 'issue_date', 'Issue Date', 'date', NULL, 0, 1, 4, '2026-04-16 12:45:15.356414', '2026-04-16 12:45:15.356414', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (500, 1, 6, 133, 'expiry_date', 'Expiry Date', 'date', NULL, 0, 1, 5, '2026-04-16 12:45:15.357786', '2026-04-16 12:45:15.357786', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (501, 1, 6, 133, 'issuing_authority', 'Issuing Authority', 'text', NULL, 0, 1, 6, '2026-04-16 12:45:15.359171', '2026-04-16 12:45:15.359171', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (458, 1, 6, 125, 'branch_id', 'Branch ID', 'text', NULL, 0, 1, 8, '2026-04-16 12:34:08.293587', '2026-04-16 12:34:08.293587', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (453, 1, 6, 125, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 1, '2026-04-16 12:34:08.265405', '2026-04-16 12:34:08.265405', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (504, 1, 6, 130, 'permit_id', 'Permit ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:02:55.224443', '2026-04-16 13:02:55.224443', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (505, 1, 6, 130, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:02:55.229465', '2026-04-16 13:02:55.229465', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (506, 1, 6, 130, 'permit_type_id', 'Permit Type ID', 'text', NULL, 0, 1, 3, '2026-04-16 13:02:55.230251', '2026-04-16 13:02:55.230251', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (507, 1, 6, 130, 'permit_no', 'Permit No', 'text', NULL, 0, 1, 4, '2026-04-16 13:02:55.230967', '2026-04-16 13:02:55.230967', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (508, 1, 6, 130, 'issue_date', 'Issue Date', 'date', NULL, 0, 1, 5, '2026-04-16 13:02:55.231776', '2026-04-16 13:02:55.231776', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (509, 1, 6, 130, 'expiry_date', 'Expiry Date', 'date', NULL, 0, 1, 6, '2026-04-16 13:02:55.232444', '2026-04-16 13:02:55.232444', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (510, 1, 6, 130, 'issuing_authority', 'Issuing Authority', 'text', NULL, 0, 1, 7, '2026-04-16 13:02:55.233098', '2026-04-16 13:02:55.233098', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (502, 1, 6, 133, 'renewal_cost', 'Renewal Cost', 'decimal', NULL, 0, 1, 7, '2026-04-16 12:45:15.360716', '2026-04-16 12:45:15.360716', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (516, 1, 6, 131, 'insurer_id', 'Vendors ID ', 'text', NULL, 0, 1, 4, '2026-04-16 13:07:04.683441', '2026-04-16 13:07:04.683441', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (513, 1, 6, 131, 'insurance_id', 'Insurance ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:07:04.67751', '2026-04-16 13:07:04.67751', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (514, 1, 6, 131, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:07:04.682029', '2026-04-16 13:07:04.682029', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (515, 1, 6, 131, 'policy_no', 'Policy No', 'text', NULL, 0, 1, 3, '2026-04-16 13:07:04.682779', '2026-04-16 13:07:04.682779', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (518, 1, 6, 131, 'start_date', 'Start Date', 'date', NULL, 0, 1, 6, '2026-04-16 13:07:04.685887', '2026-04-16 13:07:04.685887', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (456, 1, 6, 125, 'owner_id', 'Owner ID', 'text', NULL, 0, 1, 6, '2026-04-16 12:34:08.29177', '2026-04-16 12:34:08.29177', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (462, 1, 6, 125, 'model', 'Model', 'text', NULL, 0, 1, 12, '2026-04-16 12:34:08.297024', '2026-04-16 12:34:08.297024', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (459, 1, 6, 125, 'vehicle_category', 'Vehicle Category', 'dropdown', NULL, 0, 1, 9, '2026-04-16 12:34:08.29455', '2026-04-16 12:34:08.29455', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (460, 1, 6, 125, 'vehicle_body_type', 'Vehicle Body Type', 'text', NULL, 0, 1, 10, '2026-04-16 12:34:08.295567', '2026-04-16 12:34:08.295567', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (512, 1, 6, 130, 'status', 'Status', 'dropdown', NULL, 0, 1, 9, '2026-04-16 13:02:55.236445', '2026-04-16 13:02:55.236445', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (461, 1, 6, 125, 'make', 'Make', 'text', NULL, 0, 1, 11, '2026-04-16 12:34:08.29645', '2026-04-16 12:34:08.29645', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (463, 1, 6, 125, 'variant', 'Variant', 'text', NULL, 0, 1, 13, '2026-04-16 12:34:08.297485', '2026-04-16 12:34:08.297485', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (464, 1, 6, 125, 'model_year', 'Model Year', 'number', NULL, 0, 1, 14, '2026-04-16 12:34:08.297892', '2026-04-16 12:34:08.297892', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (465, 1, 6, 125, 'plate_no', 'Plate No', 'text', NULL, 0, 1, 15, '2026-04-16 12:34:08.298276', '2026-04-16 12:34:08.298276', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (466, 1, 6, 125, 'plate_emirate', 'Plate Emirate', 'text', NULL, 0, 1, 16, '2026-04-16 12:34:08.298631', '2026-04-16 12:34:08.298631', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (467, 1, 6, 125, 'chassis_no', 'Chassis No', 'text', NULL, 0, 1, 17, '2026-04-16 12:34:08.29897', '2026-04-16 12:34:08.29897', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (468, 1, 6, 125, 'engine_no', 'Engine No', 'text', NULL, 0, 1, 18, '2026-04-16 12:34:08.299302', '2026-04-16 12:34:08.299302', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (469, 1, 6, 125, 'fuel_type', 'Fuel Type', 'dropdown', NULL, 0, 1, 19, '2026-04-16 12:34:08.299664', '2026-04-16 12:34:08.299664', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (470, 1, 6, 125, 'transmission_type', 'Transmission Type', 'dropdown', NULL, 0, 1, 20, '2026-04-16 12:34:08.299991', '2026-04-16 12:34:08.299991', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (457, 1, 6, 125, 'company_id', 'Company ID', 'text', NULL, 0, 1, 7, '2026-04-16 12:34:08.292753', '2026-04-16 12:34:08.292753', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (473, 1, 6, 125, 'has_chiller', 'Has Chiller', 'boolean', NULL, 0, 1, 23, '2026-04-16 12:34:08.301026', '2026-04-16 12:34:08.301026', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (489, 1, 6, 135, 'vat_amount', 'VAT Amount', 'decimal', NULL, 0, 1, 8, '2026-04-16 12:42:53.098918', '2026-04-16 12:42:53.098918', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (472, 1, 6, 125, 'seating_capacity', 'Seating Capacity', 'number', NULL, 0, 1, 22, '2026-04-16 12:34:08.300714', '2026-04-16 12:34:08.300714', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (481, 1, 6, 136, 'remarks', 'Remarks', 'textarea', NULL, 0, 1, 8, '2026-04-16 12:39:15.149477', '2026-04-16 12:39:15.149477', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (495, 1, 6, 135, 'finance_flag', 'Finance Flag', 'radio', NULL, 0, 1, 14, '2026-04-16 12:42:53.102268', '2026-04-16 12:42:53.102268', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (488, 1, 6, 135, 'base_amount', 'Base Amount', 'decimal', NULL, 0, 1, 7, '2026-04-16 12:42:53.098144', '2026-04-16 12:42:53.098144', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (490, 1, 6, 135, 'registration_amount', 'Registration Amount', 'decimal', NULL, 0, 1, 9, '2026-04-16 12:42:53.099572', '2026-04-16 12:42:53.099572', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (491, 1, 6, 135, 'insurance_amount', 'Insurance Amount', 'decimal', NULL, 0, 1, 10, '2026-04-16 12:42:53.100035', '2026-04-16 12:42:53.100035', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (492, 1, 6, 135, 'accessory_amount', 'Accessory Amount', 'decimal', NULL, 0, 1, 11, '2026-04-16 12:42:53.100412', '2026-04-16 12:42:53.100412', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (493, 1, 6, 135, 'other_initial_cost', 'Other Initial Cost', 'decimal', NULL, 0, 1, 12, '2026-04-16 12:42:53.10085', '2026-04-16 12:42:53.10085', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (494, 1, 6, 135, 'total_acquisition_cost', 'Total Acquisition Cost', 'decimal', NULL, 0, 1, 13, '2026-04-16 12:42:53.101444', '2026-04-16 12:42:53.101444', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (471, 1, 6, 125, 'payload_kg', 'Payload KG', 'number', NULL, 0, 1, 21, '2026-04-16 12:34:08.300375', '2026-04-16 12:34:08.300375', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (511, 1, 6, 130, 'renewal_cost', 'Renewal Fee', 'decimal', NULL, 0, 1, 8, '2026-04-16 13:02:55.234064', '2026-04-16 13:02:55.234064', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (503, 1, 6, 133, 'status', 'Status', 'dropdown', NULL, 0, 1, 8, '2026-04-16 12:45:15.362135', '2026-04-16 12:45:15.362135', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (455, 1, 6, 125, 'ownership_type', 'Ownership Type', 'dropdown', NULL, 0, 1, 5, '2026-04-16 12:34:08.290739', '2026-04-16 12:34:08.290739', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (454, 1, 6, 125, 'asset_code', 'Asset Code', 'text', NULL, 0, 1, 4, '2026-04-16 12:34:08.288818', '2026-04-16 12:34:08.288818', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (519, 1, 6, 131, 'expiry_date', 'Expiry Date', 'date', NULL, 0, 1, 7, '2026-04-16 13:07:04.686701', '2026-04-16 13:07:04.686701', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (521, 1, 6, 131, 'deductible_amount', 'Deductible Amount', 'decimal', NULL, 0, 1, 9, '2026-04-16 13:07:04.690402', '2026-04-16 13:07:04.690402', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (522, 1, 6, 131, 'sum_insured', 'Sum Insured', 'decimal', NULL, 0, 1, 10, '2026-04-16 13:07:04.691029', '2026-04-16 13:07:04.691029', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (530, 1, 6, 132, 'wallet_balance', 'Wallet Balance', 'decimal', NULL, 0, 1, 7, '2026-04-16 13:45:19.274709', '2026-04-16 13:45:19.274709', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (524, 1, 6, 132, 'toll_account_id', 'Toll Account ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:45:19.223173', '2026-04-16 13:45:19.223173', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (525, 1, 6, 132, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:45:19.267178', '2026-04-16 13:45:19.267178', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (526, 1, 6, 132, 'provider_name', 'Provider Name', 'text', NULL, 0, 1, 3, '2026-04-16 13:45:19.269964', '2026-04-16 13:45:19.269964', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (527, 1, 6, 132, 'tag_no', 'Tag No', 'text', NULL, 0, 1, 4, '2026-04-16 13:45:19.270949', '2026-04-16 13:45:19.270949', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (528, 1, 6, 132, 'account_no', 'Account No', 'text', NULL, 0, 1, 5, '2026-04-16 13:45:19.272278', '2026-04-16 13:45:19.272278', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (532, 1, 6, 132, 'auto_recharge_flag', 'Auto Recharge Flag', 'boolean', NULL, 0, 1, 9, '2026-04-16 13:45:19.276693', '2026-04-16 13:45:19.276693', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (533, 1, 6, 134, 'service_id', 'Service ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:48:01.405412', '2026-04-16 13:48:01.405412', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (534, 1, 6, 134, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:48:01.408964', '2026-04-16 13:48:01.408964', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (536, 1, 6, 134, 'request_date', 'Request Date', 'date', NULL, 0, 1, 4, '2026-04-16 13:48:01.410761', '2026-04-16 13:48:01.410761', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (537, 1, 6, 134, 'vendor_id', 'Vendor ID', 'text', NULL, 0, 1, 5, '2026-04-16 13:48:01.411572', '2026-04-16 13:48:01.411572', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (539, 1, 6, 134, 'complaint_details', 'Complaint Details', 'text', NULL, 0, 1, 7, '2026-04-16 13:48:01.413166', '2026-04-16 13:48:01.413166', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (544, 1, 6, 134, 'next_due_date', 'Next Due Date', 'date', NULL, 0, 1, 12, '2026-04-16 13:48:01.417011', '2026-04-16 13:48:01.417011', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (546, 1, 6, 137, 'expense_id', 'Expense ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:50:05.215167', '2026-04-16 13:50:05.215167', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (547, 1, 6, 137, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:50:05.219152', '2026-04-16 13:50:05.219152', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (548, 1, 6, 137, 'expense_date', 'Expense Date', 'date', NULL, 0, 1, 3, '2026-04-16 13:50:05.220287', '2026-04-16 13:50:05.220287', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (550, 1, 6, 137, 'sub_category', 'Sub Category', 'text', NULL, 0, 1, 5, '2026-04-16 13:50:05.222082', '2026-04-16 13:50:05.222082', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (551, 1, 6, 137, 'vendor_id', 'Vendor ID', 'text', NULL, 0, 1, 6, '2026-04-16 13:50:05.223091', '2026-04-16 13:50:05.223091', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (552, 1, 6, 137, 'invoice_no', 'Invoice No', 'text', NULL, 0, 1, 7, '2026-04-16 13:50:05.224119', '2026-04-16 13:50:05.224119', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (553, 1, 6, 137, 'amount', 'Amount', 'number', NULL, 0, 1, 8, '2026-04-16 13:50:05.225111', '2026-04-16 13:50:05.225111', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (554, 1, 6, 137, 'vat_amount', 'VAT Amount', 'number', NULL, 0, 1, 9, '2026-04-16 13:50:05.225953', '2026-04-16 13:50:05.225953', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (555, 1, 6, 137, 'total_amount', 'Total Amount', 'number', NULL, 0, 1, 10, '2026-04-16 13:50:05.226632', '2026-04-16 13:50:05.226632', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (558, 1, 6, 141, 'incident_id', 'Incident ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:52:43.922795', '2026-04-16 13:52:43.922795', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (559, 1, 6, 141, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:52:43.931533', '2026-04-16 13:52:43.931533', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (560, 1, 6, 141, 'driver_id', 'Driver ID', 'text', NULL, 0, 1, 3, '2026-04-16 13:52:43.932966', '2026-04-16 13:52:43.932966', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (562, 1, 6, 141, 'incident_datetime', 'Incident Date & Time', 'date', NULL, 0, 1, 5, '2026-04-16 13:52:43.935647', '2026-04-16 13:52:43.935647', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (563, 1, 6, 141, 'location_text', 'Location Text', 'text', NULL, 0, 1, 6, '2026-04-16 13:52:43.936517', '2026-04-16 13:52:43.936517', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (564, 1, 6, 141, 'description', 'Description', 'text', NULL, 0, 1, 7, '2026-04-16 13:52:43.937565', '2026-04-16 13:52:43.937565', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (565, 1, 6, 141, 'police_report_no', 'Police Report No', 'text', NULL, 0, 1, 8, '2026-04-16 13:52:43.938112', '2026-04-16 13:52:43.938112', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (566, 1, 6, 141, 'fine_no', 'Fine No', 'text', NULL, 0, 1, 9, '2026-04-16 13:52:43.938559', '2026-04-16 13:52:43.938559', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (567, 1, 6, 141, 'amount', 'Amount', 'number', NULL, 0, 1, 10, '2026-04-16 13:52:43.93898', '2026-04-16 13:52:43.93898', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (568, 1, 6, 141, 'black_points', 'Black Points', 'number', NULL, 0, 1, 11, '2026-04-16 13:52:43.939415', '2026-04-16 13:52:43.939415', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (570, 1, 6, 142, 'document_id', 'Document ID', 'text', NULL, 0, 1, 1, '2026-04-16 13:55:28.943735', '2026-04-16 13:55:28.943735', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (571, 1, 6, 142, 'vehicle_id', 'Vehicle ID', 'text', NULL, 0, 1, 2, '2026-04-16 13:55:28.946374', '2026-04-16 13:55:28.946374', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (572, 1, 6, 142, 'document_type_id', 'Document Type ID', 'text', NULL, 0, 1, 3, '2026-04-16 13:55:28.947561', '2026-04-16 13:55:28.947561', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (573, 1, 6, 142, 'reference_no', 'Reference No', 'text', NULL, 0, 1, 4, '2026-04-16 13:55:28.948937', '2026-04-16 13:55:28.948937', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (574, 1, 6, 142, 'file_name', 'File Name', 'text', NULL, 0, 1, 5, '2026-04-16 13:55:28.951189', '2026-04-16 13:55:28.951189', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (575, 1, 6, 142, 'file_url', 'File URL', 'text', NULL, 0, 1, 6, '2026-04-16 13:55:28.952533', '2026-04-16 13:55:28.952533', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (576, 1, 6, 142, 'issue_date', 'Issue Date', 'date', NULL, 0, 1, 7, '2026-04-16 13:55:28.954099', '2026-04-16 13:55:28.954099', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (577, 1, 6, 142, 'expiry_date', 'Expiry Date', 'date', NULL, 0, 1, 8, '2026-04-16 13:55:28.95624', '2026-04-16 13:55:28.95624', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (578, 1, 6, 142, 'version_no', 'Version No', 'number', NULL, 0, 1, 9, '2026-04-16 13:55:28.957368', '2026-04-16 13:55:28.957368', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (579, 1, 6, 142, 'uploaded_by', 'Uploaded By', 'text', NULL, 0, 1, 10, '2026-04-16 13:55:28.958258', '2026-04-16 13:55:28.958258', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (523, 1, 6, 131, 'status', 'Status', 'dropdown', NULL, 0, 1, 11, '2026-04-16 13:07:04.691493', '2026-04-16 13:07:04.691493', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (520, 1, 6, 131, 'premium_amount', 'Premium Amount', 'decimal', NULL, 0, 1, 8, '2026-04-16 13:07:04.689617', '2026-04-16 13:07:04.689617', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (535, 1, 6, 134, 'service_type', 'Service Type', 'dropdown', NULL, 0, 1, 3, '2026-04-16 13:48:01.409874', '2026-04-16 13:48:01.409874', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (531, 1, 6, 132, 'recharge_threshold', 'Recharge Threshold', 'decimal', NULL, 0, 1, 8, '2026-04-16 13:45:19.275703', '2026-04-16 13:45:19.275703', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (540, 1, 6, 134, 'work_done', 'Work Done', 'dropdown', NULL, 0, 1, 8, '2026-04-16 13:48:01.414001', '2026-04-16 13:48:01.414001', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (538, 1, 6, 134, 'odometer_at_service', 'Odometer at Service', 'decimal', NULL, 0, 1, 6, '2026-04-16 13:48:01.41237', '2026-04-16 13:48:01.41237', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (541, 1, 6, 134, 'parts_cost', 'Parts Cost', 'decimal', NULL, 0, 1, 9, '2026-04-16 13:48:01.414813', '2026-04-16 13:48:01.414813', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (542, 1, 6, 134, 'labor_cost', 'Labor Cost', 'decimal', NULL, 0, 1, 10, '2026-04-16 13:48:01.415575', '2026-04-16 13:48:01.415575', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (543, 1, 6, 134, 'total_cost', 'Total Cost', 'decimal', NULL, 0, 1, 11, '2026-04-16 13:48:01.416331', '2026-04-16 13:48:01.416331', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (545, 1, 6, 134, 'next_due_km', 'Next Due KM', 'decimal', NULL, 0, 1, 13, '2026-04-16 13:48:01.417644', '2026-04-16 13:48:01.417644', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (604, 1, 6, 125, 'status', 'Status', 'dropdown', NULL, 0, 1, 27, '2026-04-16 14:01:09.845548', '2026-04-16 14:01:09.845548', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (601, 1, 6, 125, 'chiller_brand', 'Chiller Brand', 'text', NULL, 0, 1, 24, '2026-04-16 14:01:09.842199', '2026-04-16 14:01:09.842199', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (549, 1, 6, 137, 'expense_category_id', 'Expense Category ID', 'text', NULL, 0, 0, 4, '2026-04-16 13:50:05.221188', '2026-04-16 13:50:05.221188', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (607, 1, 6, 125, 'vehicle_name', 'Vehicle Name', 'text', NULL, 1, 1, 2, '2026-04-16 15:18:21.798484', '2026-04-16 15:18:21.798484', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (556, 1, 6, 137, 'payment_mode', 'Payment Mode', 'dropdown', NULL, 0, 1, 11, '2026-04-16 13:50:05.227384', '2026-04-16 13:50:05.227384', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (557, 1, 6, 137, 'status', 'Status', 'dropdown', NULL, 0, 1, 12, '2026-04-16 13:50:05.228124', '2026-04-16 13:50:05.228124', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (561, 1, 6, 141, 'incident_type', 'Incident Type', 'dropdown', NULL, 0, 1, 4, '2026-04-16 13:52:43.934414', '2026-04-16 13:52:43.934414', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (569, 1, 6, 141, 'claim_status', 'Claim Status', 'dropdown', NULL, 0, 1, 12, '2026-04-16 13:52:43.939816', '2026-04-16 13:52:43.939816', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (529, 1, 6, 132, 'tag_status', 'Tag Status', 'dropdown', NULL, 0, 1, 6, '2026-04-16 13:45:19.27363', '2026-04-16 13:45:19.27363', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (633, 1, 6, 125, 'color_', 'Color ', 'text', NULL, 1, 1, 28, '2026-04-17 15:44:40.066411', '2026-04-17 15:44:40.066411', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (634, 1, 6, 125, 'notes', 'Notes', 'textarea', NULL, 1, 1, 30, '2026-04-17 15:44:40.070326', '2026-04-17 15:44:40.070326', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (603, 1, 6, 125, 'current_odometer', 'Current Odometer', 'number', NULL, 0, 1, 26, '2026-04-16 14:01:09.844932', '2026-04-16 14:01:09.844932', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (605, 1, 6, 125, 'vehicle_name_', 'Vehicle Name', 'text', NULL, 1, 0, 1, '2026-04-16 15:09:36.402367', '2026-04-16 15:09:36.402367', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (632, 1, 6, 125, 'current_mileage__km_', 'Current Mileage (km)', 'number', NULL, 1, 1, 29, '2026-04-17 15:44:40.066582', '2026-04-17 15:44:40.066582', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (635, 1, 6, 125, 'paylod_capacity_', 'Paylod Capacity ', 'text', NULL, 1, 1, 1, '2026-04-17 15:50:52.399206', '2026-04-17 15:50:52.399206', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (722, 1, 6, 135, 'down_payment', 'Down Payment (AED)', 'number', '0', 0, 1, 54, '2026-04-17 17:41:04.362171', '2026-04-17 17:41:04.362171', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (602, 1, 6, 125, 'chiller_serial_no', 'Chiller Serial No', 'text', NULL, 0, 1, 25, '2026-04-16 14:01:09.844391', '2026-04-16 14:01:09.844391', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (661, 1, 6, 125, 'vehicle_type', 'Vehicle Type', 'dropdown', NULL, 0, 1, 3, '2026-04-17 15:52:19.386649', '2026-04-17 15:52:19.386649', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (691, 1, 6, 137, 'date', 'Date', 'date', NULL, 0, 1, 14, '2026-04-17 16:08:23.938058', '2026-04-17 16:08:23.938058', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (692, 1, 6, 137, 'receipt_no_', 'Receipt No.', 'text', NULL, 0, 1, 17, '2026-04-17 16:08:23.939427', '2026-04-17 16:08:23.939427', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (693, 1, 6, 137, 'description___notes', 'Description / Notes', 'textarea', NULL, 0, 1, 18, '2026-04-17 16:08:23.942862', '2026-04-17 16:08:23.942862', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (694, 1, 6, 137, 'amount_', 'Amount ', 'text', NULL, 0, 1, 15, '2026-04-17 16:08:23.94744', '2026-04-17 16:08:23.94744', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (695, 1, 6, 137, 'plate_no', 'Plate No', 'text', NULL, 0, 1, 1, '2026-04-17 16:08:24.034005', '2026-04-17 16:08:24.034005', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (696, 1, 6, 137, 'vendor_supplier', 'Vendor/Supplier', 'text', NULL, 0, 1, 16, '2026-04-17 16:08:24.055522', '2026-04-17 16:08:24.055522', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (697, 1, 6, 137, 'category_', 'Category ', 'dropdown', NULL, 1, 1, 1, '2026-04-17 16:18:42.873627', '2026-04-17 16:18:42.873627', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (698, 1, 6, 137, 'expense_category', 'Category', 'dropdown', NULL, 0, 1, 4, '2026-04-17 16:21:22.745847', '2026-04-17 16:21:22.745847', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (699, 1, 6, 135, 'plate_no', 'Plate No', 'text', NULL, 0, 1, 1, '2026-04-17 17:09:06.048778', '2026-04-17 17:09:06.048778', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (700, 1, 6, 135, 'document_attchment_', 'Document Attchment ', 'file', NULL, 0, 1, 19, '2026-04-17 17:09:06.052973', '2026-04-17 17:09:06.052973', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (701, 1, 6, 135, 'chassis_no', 'Chassis No', 'text', NULL, 0, 1, 17, '2026-04-17 17:09:06.055018', '2026-04-17 17:09:06.055018', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (703, 1, 6, 135, 'supplier_dealer', 'Supplier/Dealer', 'text', NULL, 0, 1, 16, '2026-04-17 17:09:06.160302', '2026-04-17 17:09:06.160302', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (704, 1, 6, 132, 'minimum_balance', 'Minimum Balance', 'text', NULL, 1, 1, 12, '2026-04-17 17:19:27.085654', '2026-04-17 17:19:27.085654', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (705, 1, 6, 132, 'toll_system', 'Toll System', 'dropdown', NULL, 0, 1, 1, '2026-04-17 17:19:27.087056', '2026-04-17 17:19:27.087056', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (706, 1, 6, 132, 'auto_recharge_enabled_', 'Auto Recharge Enabled ', 'radio', NULL, 0, 1, 13, '2026-04-17 17:19:27.090957', '2026-04-17 17:19:27.090957', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (707, 1, 6, 132, 'current_balance_', 'Current Balance ', 'text', NULL, 1, 1, 11, '2026-04-17 17:19:27.097944', '2026-04-17 17:19:27.097944', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (708, 1, 6, 132, 'auto_recharge_amount', 'Auto Recharge Amount', 'text', NULL, 1, 0, 14, '2026-04-17 17:19:27.101112', '2026-04-17 17:19:27.101112', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (709, 1, 6, 132, 'linked_rta_itc_email', 'Linked RTA/ITC Email', 'text', NULL, 1, 1, 16, '2026-04-17 17:19:27.104757', '2026-04-17 17:19:27.104757', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (710, 1, 6, 132, 'account_open_date', 'Account Open Date', 'date', NULL, 1, 0, 15, '2026-04-17 17:19:27.107407', '2026-04-17 17:19:27.107407', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (711, 1, 6, 132, 'notes', 'Notes', 'textarea', NULL, 0, 1, 17, '2026-04-17 17:19:27.116371', '2026-04-17 17:19:27.116371', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (712, 1, 6, 132, 'account_name', 'Account Name', 'text', NULL, 0, 1, 1, '2026-04-17 17:21:30.295199', '2026-04-17 17:21:30.295199', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (713, 1, 6, 143, 'bank_name', 'Bank Name', 'text', NULL, 0, 1, 0, '2026-04-17 17:21:59.738133', '2026-04-17 17:21:59.738133', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (714, 1, 6, 143, 'loan_amount', 'Loan Amount', 'number', NULL, 0, 1, 0, '2026-04-17 17:21:59.741578', '2026-04-17 17:21:59.741578', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (716, 1, 6, 135, 'purchase_price_', 'Purchase Price ', 'text', NULL, 0, 1, 1, '2026-04-17 17:33:26.593138', '2026-04-17 17:33:26.593138', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (717, 1, 6, 135, 'payment_method_', 'Payment Method ', 'dropdown', NULL, 0, 1, 22, '2026-04-17 17:33:26.595523', '2026-04-17 17:33:26.595523', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (715, 1, 6, 135, 'bank_details', 'Bank Details (Conditional)', 'text', NULL, 0, 1, 0, '2026-04-17 17:23:10.654531', '2026-04-17 17:23:10.654531', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (718, 1, 6, 135, 'finance_header', 'Finance / Lease Details', 'header', NULL, 0, 1, 50, '2026-04-17 17:41:04.352306', '2026-04-17 17:41:04.352306', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (723, 1, 6, 135, 'monthly_instalment', 'Monthly Instalment (AED)', 'number', '0', 0, 1, 55, '2026-04-17 17:41:04.363055', '2026-04-17 17:41:04.363055', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (724, 1, 6, 135, 'tenure_months', 'Tenure (Months)', 'number', 'e.g. 48', 0, 1, 56, '2026-04-17 17:41:04.363922', '2026-04-17 17:41:04.363922', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (702, 1, 6, 135, 'notes', 'Notes', 'textarea', 'Any additional notes about this purchase...', 0, 1, 18, '2026-04-17 17:09:06.058445', '2026-04-17 17:09:06.058445', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (730, 1, 6, 135, 'tttt', 'tttt', 'dropdown', NULL, 0, 1, 1, '2026-04-17 18:37:40.83202', '2026-04-17 18:37:40.83202', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (731, 1, 6, 135, 'tttt_details', 'uuuuuuuuuu', 'text', NULL, 0, 1, 2, '2026-04-17 18:37:40.834606', '2026-04-17 18:37:40.834606', NULL, '{"depends_on": "tttt", "show_if_equals": ""}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (726, 1, 6, 135, 'finance_start_date', 'Finance Start Date', 'date', NULL, 0, 1, 58, '2026-04-17 17:41:04.365148', '2026-04-17 17:41:04.365148', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (727, 1, 6, 135, 'finance_end_date', 'Finance End Date', 'date', NULL, 0, 1, 59, '2026-04-17 17:41:04.365708', '2026-04-17 17:41:04.365708', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (729, 1, 6, 135, 'finance_documents', 'Finance Document Attachment', 'file', NULL, 0, 1, 65, '2026-04-17 18:13:39.565347', '2026-04-17 18:13:39.565347', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (719, 1, 6, 135, 'finance_company', 'Bank / Finance Company', 'text', 'Emirates NBD / ADCB / DIB...', 0, 1, 51, '2026-04-17 17:41:04.35909', '2026-04-17 17:41:04.35909', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (720, 1, 6, 135, 'finance_agreement_no', 'Finance Agreement No.', 'text', 'Agreement / contract number', 0, 1, 52, '2026-04-17 17:41:04.360093', '2026-04-17 17:41:04.360093', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (721, 1, 6, 135, 'loan_amount', 'Loan / Lease Amount (AED)', 'number', '0', 0, 1, 53, '2026-04-17 17:41:04.360996', '2026-04-17 17:41:04.360996', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (725, 1, 6, 135, 'interest_rate', 'Interest / Profit Rate (%)', 'number', 'e.g. 3.5', 0, 1, 57, '2026-04-17 17:41:04.364517', '2026-04-17 17:41:04.364517', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (728, 1, 6, 135, 'balloon_amount', 'Balloon / Residual (AED)', 'number', '0 if none', 0, 1, 60, '2026-04-17 17:41:04.366616', '2026-04-17 17:41:04.366616', NULL, '{"depends_on": "payment_method_", "show_if_equals": "bank_finance_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (732, 1, 6, 135, 'bank_method_', 'Bank method ', 'dropdown', NULL, 0, 1, 1, '2026-04-18 10:02:08.01034', '2026-04-18 10:02:08.01034', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (735, 1, 6, 135, 'bank_account_no', 'Bank Account', 'text', NULL, 0, 1, 1, '2026-04-18 12:11:17.224814', '2026-04-18 12:11:17.224814', NULL, '{"depends_on": "bank_method_", "show_if_equals": "paid_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (733, 1, 6, 135, 'amt', 'amt', 'text', NULL, 0, 1, 2, '2026-04-18 10:02:08.0128', '2026-04-18 10:02:08.0128', NULL, '{"depends_on": "bank_method_", "render_type": "modal", "show_if_equals": "paid_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (738, 1, 6, 131, 'agent___broker', 'Agent / Broker', 'text', NULL, 0, 1, 17, '2026-04-22 09:53:09.16766', '2026-04-22 09:53:09.16766', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (737, 1, 6, 131, 'plate_no', 'Plate No', 'text', NULL, 0, 1, 1, '2026-04-22 09:53:09.160524', '2026-04-22 09:53:09.160524', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (739, 1, 6, 131, 'excess_amount_', 'Excess Amount ', 'text', NULL, 0, 1, 19, '2026-04-22 09:53:09.182621', '2026-04-22 09:53:09.182621', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (741, 1, 6, 131, 'policy_number', 'Policy Number', 'text', NULL, 0, 1, 14, '2026-04-22 09:53:09.216948', '2026-04-22 09:53:09.216948', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (740, 1, 6, 131, 'document_attachments', 'Document Attachments', 'file', NULL, 0, 1, 21, '2026-04-22 09:53:09.214739', '2026-04-22 09:53:09.214739', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (742, 1, 6, 131, 'type', 'Type', 'dropdown', NULL, 0, 1, 15, '2026-04-22 09:53:09.21911', '2026-04-22 09:53:09.21911', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (743, 1, 6, 131, 'annual_premium__aed_', 'Annual Premium (AED)', 'text', NULL, 0, 1, 16, '2026-04-22 09:53:09.228882', '2026-04-22 09:53:09.228882', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (744, 1, 6, 131, 'insurance_company_', 'Insurance Company ', 'text', NULL, 0, 1, 13, '2026-04-22 09:53:09.260208', '2026-04-22 09:53:09.260208', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (745, 1, 6, 131, 'agency_repair', 'Agency Repair', 'dropdown', NULL, 0, 1, 18, '2026-04-22 09:53:09.278662', '2026-04-22 09:53:09.278662', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (746, 1, 6, 131, 'notes', 'Notes', 'text', NULL, 0, 1, 20, '2026-04-22 09:53:09.297015', '2026-04-22 09:53:09.297015', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (747, 1, 12, 144, 'company_', 'Company ', 'text', NULL, 1, 1, 1, '2026-04-23 13:00:20.682904', '2026-04-23 13:00:20.682904', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (748, 1, 12, 144, 'traffic_file_number', 'Traffic File Number', 'text', NULL, 1, 1, 2, '2026-04-23 13:00:20.703149', '2026-04-23 13:00:20.703149', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (749, 1, 12, 144, 'vehicle_id', 'Vehicle ID', 'text', NULL, 1, 1, 3, '2026-04-23 13:00:20.707556', '2026-04-23 13:00:20.707556', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (750, 1, 12, 144, 'plate_number_', 'Plate Number ', 'text', NULL, 1, 1, 4, '2026-04-23 13:00:20.712918', '2026-04-23 13:00:20.712918', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (751, 1, 12, 144, 'vehicle_type', 'Vehicle Type', 'dropdown', NULL, 0, 1, 5, '2026-04-23 13:00:20.71807', '2026-04-23 13:00:20.71807', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (752, 1, 12, 144, 'make', 'Make', 'text', NULL, 0, 1, 6, '2026-04-23 13:03:02.185829', '2026-04-23 13:03:02.185829', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (753, 1, 12, 144, 'seating_capacity_', 'Seating Capacity ', 'text', NULL, 0, 1, 10, '2026-04-23 13:03:02.191108', '2026-04-23 13:03:02.191108', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (754, 1, 12, 144, 'chassis_no___vin_', 'Chassis No. (VIN)', 'text', NULL, 0, 1, 11, '2026-04-23 13:03:02.201092', '2026-04-23 13:03:02.201092', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (755, 1, 12, 144, 'year', 'Year', 'text', NULL, 0, 1, 8, '2026-04-23 13:03:02.203664', '2026-04-23 13:03:02.203664', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (756, 1, 12, 144, 'model', 'Model', 'text', NULL, 0, 1, 7, '2026-04-23 13:03:02.207393', '2026-04-23 13:03:02.207393', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (757, 1, 12, 144, 'color', 'Color', 'text', NULL, 0, 1, 9, '2026-04-23 13:03:02.21016', '2026-04-23 13:03:02.21016', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (758, 1, 12, 144, 'engine_no_', 'Engine No.', 'text', NULL, 0, 1, 12, '2026-04-23 13:03:02.211139', '2026-04-23 13:03:02.211139', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (759, 1, 12, 144, 'fuel_type', 'Fuel Type', 'dropdown', NULL, 0, 1, 13, '2026-04-23 13:03:02.217095', '2026-04-23 13:03:02.217095', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (760, 1, 12, 144, 'current_mileage__km_', 'Current Mileage (km)', 'text', NULL, 0, 1, 14, '2026-04-23 13:04:17.11923', '2026-04-23 13:04:17.11923', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (761, 1, 12, 144, 'status', 'Status', 'dropdown', NULL, 0, 1, 15, '2026-04-23 13:04:17.123016', '2026-04-23 13:04:17.123016', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (762, 1, 12, 144, 'notes', 'Notes', 'textarea', NULL, 0, 1, 16, '2026-04-23 13:04:17.232239', '2026-04-23 13:04:17.232239', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (763, 1, 14, 146, 'plate_no', 'Plate No', 'text', NULL, 0, 1, 1, '2026-04-23 14:59:33.475497', '2026-04-23 14:59:33.475497', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (764, 1, 14, 146, 'supplier___dealer', 'Supplier / Dealer', 'text', NULL, 0, 1, 3, '2026-04-23 14:59:33.482752', '2026-04-23 14:59:33.482752', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (765, 1, 14, 146, 'chassis_no___vin_', 'Chassis No. (VIN)', 'text', NULL, 0, 1, 6, '2026-04-23 14:59:33.488176', '2026-04-23 14:59:33.488176', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (766, 1, 14, 146, 'invoice_no', 'Invoice No', 'text', NULL, 0, 1, 7, '2026-04-23 14:59:33.490823', '2026-04-23 14:59:33.490823', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (767, 1, 14, 146, 'vat_amount_', 'VAT Amount ', 'text', NULL, 0, 1, 8, '2026-04-23 14:59:33.504378', '2026-04-23 14:59:33.504378', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (770, 1, 14, 146, 'purchase_date_', 'Purchase Date ', 'date', NULL, 0, 1, 2, '2026-04-23 14:59:33.57567', '2026-04-23 14:59:33.57567', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (771, 1, 14, 146, 'purchase_price_', 'Purchase Price ', 'text', NULL, 0, 1, 4, '2026-04-23 14:59:33.593167', '2026-04-23 14:59:33.593167', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (772, 1, 13, 145, 'plate_no', 'Plate No', 'text', NULL, 1, 1, 1, '2026-04-23 15:03:04.326322', '2026-04-23 15:03:04.326322', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (773, 1, 13, 145, 'insurance_company', 'Insurance Company', 'text', NULL, 1, 1, 2, '2026-04-23 15:03:04.327272', '2026-04-23 15:03:04.327272', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (774, 1, 13, 145, 'policy_number', 'Policy Number', 'text', NULL, 1, 1, 3, '2026-04-23 15:03:04.33212', '2026-04-23 15:03:04.33212', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (775, 1, 13, 145, 'expiry_date', 'Expiry Date', 'date', NULL, 1, 1, 6, '2026-04-23 15:03:04.337852', '2026-04-23 15:03:04.337852', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (776, 1, 13, 145, 'start_date', 'Start Date', 'date', NULL, 1, 1, 5, '2026-04-23 15:03:04.337958', '2026-04-23 15:03:04.337958', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (777, 1, 13, 145, 'agent___broker', 'Agent / Broker', 'text', NULL, 1, 1, 8, '2026-04-23 15:03:04.339957', '2026-04-23 15:03:04.339957', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (778, 1, 13, 145, 'type', 'Type', 'dropdown', NULL, 1, 1, 4, '2026-04-23 15:03:04.340108', '2026-04-23 15:03:04.340108', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (779, 1, 13, 145, 'annual_premium__aed_', 'Annual Premium (AED)', 'text', NULL, 1, 1, 7, '2026-04-23 15:03:04.344177', '2026-04-23 15:03:04.344177', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (780, 1, 13, 145, 'agency_repair', 'Agency Repair', 'dropdown', NULL, 1, 1, 9, '2026-04-23 15:03:04.349128', '2026-04-23 15:03:04.349128', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (781, 1, 13, 145, 'excess_amount__aed_', 'Excess Amount (AED)', 'text', NULL, 1, 1, 10, '2026-04-23 15:03:04.351149', '2026-04-23 15:03:04.351149', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (782, 1, 13, 145, 'notes', 'Notes', 'textarea', NULL, 1, 1, 11, '2026-04-23 15:03:04.352914', '2026-04-23 15:03:04.352914', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (783, 1, 13, 145, 'document_attachments', 'Document Attachments', 'file', NULL, 1, 1, 12, '2026-04-23 15:03:04.359676', '2026-04-23 15:03:04.359676', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (795, 1, 12, 144, 'vehicle_name_', 'Vehicle Name ', 'text', NULL, 0, 1, 1, '2026-04-25 10:20:29.448897', '2026-04-25 10:20:29.448897', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (796, 1, 14, 146, 'sddd', 'sddd', 'text', NULL, 0, 1, 4, '2026-04-27 11:59:24.726043', '2026-04-27 11:59:24.726043', NULL, '{"depends_on": "test", "render_type": "inline", "show_if_equals": "option_1_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (797, 1, 14, 146, 'test', 'test', 'dropdown', NULL, 1, 1, 1, '2026-04-27 11:59:24.816852', '2026-04-27 11:59:24.816852', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (799, 1, 14, 146, 'gggg', 'gggg', 'text', NULL, 0, 1, 2, '2026-04-27 11:59:24.837235', '2026-04-27 11:59:24.837235', NULL, '{"depends_on": "test", "render_type": "inline", "show_if_equals": "option_1_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (798, 1, 14, 146, 'dsdd', 'dsdd', 'text', NULL, 0, 1, 3, '2026-04-27 11:59:24.837179', '2026-04-27 11:59:24.837179', NULL, '{"depends_on": "test", "render_type": "inline", "show_if_equals": "option_1_"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (813, 1, 14, 146, 'loan', 'loan', 'text', NULL, 0, 1, 2, '2026-04-27 12:41:00.610815', '2026-04-27 12:41:00.610815', NULL, '{"depends_on": "payemnt_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (814, 1, 12, 144, 'vehile_111', 'vehile 111', 'text', NULL, 0, 1, 1, '2026-04-27 15:11:49.695485', '2026-04-27 15:11:49.695485', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (822, 1, 14, 146, 'interest___profit_rate____', 'Interest / Profit Rate (%)', 'text', NULL, 0, 1, 8, '2026-04-27 16:11:56.465145', '2026-04-27 16:11:56.465145', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (828, 1, 14, 146, 'payment_method', 'Payment Method', 'dropdown', NULL, 0, 1, 1, '2026-04-27 16:11:56.553727', '2026-04-27 16:11:56.553727', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (823, 1, 14, 146, 'finance_start_date', 'Finance Start Date', 'date', NULL, 0, 1, 9, '2026-04-27 16:11:56.466734', '2026-04-27 16:11:56.466734', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (821, 1, 14, 146, 'finance_end_date', 'Finance End Date', 'date', NULL, 0, 1, 10, '2026-04-27 16:11:56.464956', '2026-04-27 16:11:56.464956', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (824, 1, 14, 146, 'balloon___residual', 'Balloon / Residual', 'text', NULL, 0, 1, 11, '2026-04-27 16:11:56.468991', '2026-04-27 16:11:56.468991', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (826, 1, 14, 146, 'finance_agreement_no_', 'Finance Agreement No.', 'text', NULL, 0, 1, 3, '2026-04-27 16:11:56.473654', '2026-04-27 16:11:56.473654', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (827, 1, 14, 146, 'loan___lease_amount_', 'Loan / Lease Amount ', 'text', NULL, 0, 1, 4, '2026-04-27 16:11:56.478411', '2026-04-27 16:11:56.478411', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (819, 1, 14, 146, 'monthly_instalment_', 'Monthly Instalment ', 'text', NULL, 0, 1, 6, '2026-04-27 16:11:56.455536', '2026-04-27 16:11:56.455536', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (818, 1, 14, 146, 'down_payment_', 'Down Payment ', 'text', NULL, 0, 1, 5, '2026-04-27 16:11:56.451681', '2026-04-27 16:11:56.451681', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (820, 1, 14, 146, 'tenure__months_', 'Tenure (months)', 'text', NULL, 0, 1, 7, '2026-04-27 16:11:56.460246', '2026-04-27 16:11:56.460246', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (825, 1, 14, 146, 'bank___finance_company', 'Bank / Finance Company55', 'text', NULL, 0, 1, 2, '2026-04-27 16:11:56.470424', '2026-04-27 16:11:56.470424', NULL, '{"depends_on": "payment_method", "render_type": "inline", "show_if_equals": "bank_finance"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (829, 1, 14, 146, 'notes', 'Notes', 'textarea', NULL, 0, 1, 1, '2026-04-28 13:07:26.144824', '2026-04-28 13:07:26.144824', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_section_fields VALUES (830, 1, 14, 146, 'document_attachments', 'Document Attachments', 'file', NULL, 0, 1, 25, '2026-04-28 13:07:26.145695', '2026-04-28 13:07:26.145695', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5516 (class 0 OID 20484)
-- Dependencies: 254
-- Data for Name: module_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.module_sections VALUES (141, 1, 6, 'Vehicle Incidents', 100, '2026-04-16 13:52:43.903406', '2026-04-16 13:52:43.903406', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (142, 1, 6, 'Vehicle Documents', 110, '2026-04-16 13:55:28.939844', '2026-04-16 13:55:28.939844', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (143, 1, 6, 'Finance Details', 11, '2026-04-17 17:21:59.719551', '2026-04-17 17:21:59.719551', '{"depends_on": "sec135_finance_flag", "show_if_equals": "Yes"}') ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (144, 1, 12, 'Vehicle Details 1 ', 0, '2026-04-23 12:31:58.530454', '2026-04-23 12:31:58.530454', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (145, 1, 13, 'Vehicle Insurance1', 1, '2026-04-23 14:50:13.823896', '2026-04-23 14:50:13.823896', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (146, 1, 14, 'Vehicle Purchase1', 2, '2026-04-23 14:56:54.443699', '2026-04-23 14:56:54.443699', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (123, 1, 6, 'Registration & Insurance', 2, '2026-04-06 14:38:30.421172', '2026-04-06 14:38:30.421172', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (124, 1, 6, 'Technical Specifications', 4, '2026-04-06 14:38:30.423981', '2026-04-06 14:38:30.423981', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (125, 1, 6, 'Vehicle details', 1, '2026-04-06 14:57:26.542985', '2026-04-06 14:57:26.542985', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (130, 1, 6, 'Vehicle Permit', 3, '2026-04-07 14:57:50.892872', '2026-04-07 14:57:50.892872', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (131, 1, 6, 'Vehicle Insurance', 8, '2026-04-07 17:47:32.819051', '2026-04-07 17:47:32.819051', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (132, 1, 6, 'Vehicle Toll Account', 9, '2026-04-07 17:56:31.150279', '2026-04-07 17:56:31.150279', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (133, 1, 6, 'Vehicle Registration', 7, '2026-04-08 09:57:35.863462', '2026-04-08 09:57:35.863462', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (134, 1, 6, 'Vehicle Services', 13, '2026-04-08 10:44:35.619347', '2026-04-08 10:44:35.619347', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (135, 1, 6, 'Vehicle Purchases', 6, '2026-04-08 11:02:19.791018', '2026-04-08 11:02:19.791018', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (136, 1, 6, 'Vehicle Assignment', 5, '2026-04-08 11:09:37.15658', '2026-04-08 11:09:37.15658', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.module_sections VALUES (137, 1, 6, 'Vehicle Expenses', 10, '2026-04-08 11:23:35.159373', '2026-04-08 11:23:35.159373', NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5518 (class 0 OID 20500)
-- Dependencies: 256
-- Data for Name: module_subhead_options; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5520 (class 0 OID 20518)
-- Dependencies: 258
-- Data for Name: module_subheads; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5522 (class 0 OID 20537)
-- Dependencies: 260
-- Data for Name: module_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5524 (class 0 OID 20554)
-- Dependencies: 262
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.modules VALUES (1, 1, 'premises', 'Premises', 'Configure office/warehouse premises, identity, specs, lease/legal, utilities, docs', 'ACTIVE', '2026-01-26 07:24:43', '2026-01-26 07:24:43') ON CONFLICT DO NOTHING;
INSERT INTO public.modules VALUES (2, 1, 'asset_categories', 'Asset_categories', 'Custom module', 'ACTIVE', '2026-01-26 07:26:41', '2026-01-26 07:26:41') ON CONFLICT DO NOTHING;
INSERT INTO public.modules VALUES (3, 1, 'employees', 'Employees', 'Employee directory and role assignment', 'ACTIVE', '2026-01-26 07:28:34', '2026-01-26 07:28:34') ON CONFLICT DO NOTHING;
INSERT INTO public.modules VALUES (4, 1, 'assets', 'Assets', 'Track company assets, assignment, and lifecycle', 'ACTIVE', '2026-01-26 07:29:33', '2026-01-26 07:29:33') ON CONFLICT DO NOTHING;
INSERT INTO public.modules VALUES (5, 1, 'maintenance', 'Maintenance', 'Custom module', 'ACTIVE', '2026-01-26 07:58:46', '2026-01-26 07:58:46') ON CONFLICT DO NOTHING;


--
-- TOC entry 5526 (class 0 OID 20571)
-- Dependencies: 264
-- Data for Name: modules_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.modules_master VALUES (1, 'dashboard', 'Dashboard', 'Overview of all assets and activities', 'dashboard') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (2, 'assets', 'Asset Management', 'Manage and track company assets', 'inventory') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (3, 'departments', 'Departments', 'Manage company departments', 'business') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (4, 'employees', 'Employee Directory', 'Manage employees and their assignments', 'people') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (5, 'categories', 'Asset Categories', 'Define types of assets', 'category') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (6, 'requests', 'Asset Requests', 'Handle employee asset requests', 'assignment') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (7, 'maintenance', 'Maintenance', 'Schedule and track asset maintenance', 'build') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (8, 'reports', 'Reports', 'Generate and export asset reports', 'bar-chart') ON CONFLICT DO NOTHING;
INSERT INTO public.modules_master VALUES (9, 'settings', 'Settings', 'Company and user configuration', 'settings') ON CONFLICT DO NOTHING;


--
-- TOC entry 5527 (class 0 OID 20582)
-- Dependencies: 265
-- Data for Name: office_owned_details; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5529 (class 0 OID 20600)
-- Dependencies: 267
-- Data for Name: office_premise_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5531 (class 0 OID 20616)
-- Dependencies: 269
-- Data for Name: office_premises; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.office_premises VALUES (94, 1, 'All', 'All - All', 'All', 'ALL', 'UAE', 3, NULL, 'Ajman Emirate', 'All, Ajman Emirate', NULL, 'Active', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Ajman Emirate') ON CONFLICT DO NOTHING;
INSERT INTO public.office_premises VALUES (95, 1, 'OWNED', 'Office - Free Zone', 'Free Zone', 'OFFICE', 'UAE', 2, NULL, 'Abu Dhabi Emirate', 'Free Zone, Abu Dhabi Emirate', NULL, 'Active', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Abu Dhabi Emirate') ON CONFLICT DO NOTHING;
INSERT INTO public.office_premises VALUES (96, 1, 'All', 'Office - Free Zone', 'Free Zone', 'OFFICE', 'UAE', 2, NULL, 'Abu Dhabi Emirate', 'Free Zone, Abu Dhabi Emirate', NULL, 'Active', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Abu Dhabi Emirate') ON CONFLICT DO NOTHING;
INSERT INTO public.office_premises VALUES (97, 1, 'All', 'Office - Free Zone', 'Free Zone', 'OFFICE', 'UAE', 2, NULL, 'Abu Dhabi Emirate', 'Free Zone, Abu Dhabi Emirate', NULL, 'Active', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Abu Dhabi Emirate') ON CONFLICT DO NOTHING;
INSERT INTO public.office_premises VALUES (98, 1, 'All', 'Office - Free Zone', 'Free Zone', 'OFFICE', 'UAE', 2, NULL, 'Abu Dhabi Emirate', 'Free Zone, Abu Dhabi Emirate', NULL, 'Active', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Abu Dhabi Emirate') ON CONFLICT DO NOTHING;


--
-- TOC entry 5533 (class 0 OID 20641)
-- Dependencies: 271
-- Data for Name: office_premises_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5534 (class 0 OID 20657)
-- Dependencies: 272
-- Data for Name: office_premises_utilities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5535 (class 0 OID 20666)
-- Dependencies: 273
-- Data for Name: office_rental_details; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5537 (class 0 OID 20682)
-- Dependencies: 275
-- Data for Name: premises_module_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.premises_module_details VALUES (1, 33, 1, 'premises_id', 'ppp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (2, 33, 1, 'primary_contact', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (3, 33, 1, 'password', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (4, 33, 1, 'premises_type_', 'W', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (5, 33, 1, 'company___business_unit', 'ppp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (6, 33, 1, 'department_s_', 'ppp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (7, 33, 1, 'occupancy_status', 'OCCUPIED', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (8, 33, 1, 'floor', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (9, 33, 1, 'makani_no', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (10, 33, 1, 'plot_parcel_no', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (11, 33, 1, 'po_box', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (12, 33, 1, 'google_maps_link', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (13, 33, 1, 'access_notes', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (14, 33, 1, 'washrooms', 'ppp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (15, 33, 1, 'reception', 'yes', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (16, 33, 1, 'internet_type_', 'dsl', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (17, 33, 1, 'power_capacity__kw_kva_', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (18, 33, 1, 'parking_slots', 'ppp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (19, 33, 1, 'fit_out_level', 'shell', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (20, 33, 1, 'furniture_ownership', 'owned', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (21, 33, 1, 'owner_legal_entity', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (22, 33, 1, 'test_label', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (23, 33, 1, 'title_deed_no', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (24, 33, 1, 'purchase_date', 'pp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (25, 33, 1, 'purchase_value_', 'ppp', '2026-01-31 11:18:00', '2026-01-31 11:18:00') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (26, 34, 1, 'premises_id', 'ppp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (27, 34, 1, 'primary_contact', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (28, 34, 1, 'password', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (29, 34, 1, 'premises_type_', 'W', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (30, 34, 1, 'company___business_unit', 'ppp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (31, 34, 1, 'department_s_', 'ppp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (32, 34, 1, 'occupancy_status', 'OCCUPIED', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (33, 34, 1, 'floor', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (34, 34, 1, 'makani_no', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (35, 34, 1, 'plot_parcel_no', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (36, 34, 1, 'po_box', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (37, 34, 1, 'google_maps_link', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (38, 34, 1, 'access_notes', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (39, 34, 1, 'washrooms', 'ppp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (40, 34, 1, 'reception', 'yes', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (41, 34, 1, 'internet_type_', 'dsl', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (42, 34, 1, 'power_capacity__kw_kva_', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (43, 34, 1, 'parking_slots', 'ppp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (44, 34, 1, 'fit_out_level', 'shell', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (45, 34, 1, 'furniture_ownership', 'owned', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (46, 34, 1, 'owner_legal_entity', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (47, 34, 1, 'test_label', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (48, 34, 1, 'title_deed_no', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (49, 34, 1, 'purchase_date', 'pp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (50, 34, 1, 'purchase_value_', 'ppp', '2026-02-02 11:01:31', '2026-02-02 11:01:31') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (51, 35, 1, 'area', 'Free Zone', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (52, 35, 1, 'premises_id', '307', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (53, 35, 1, 'primary_contact', '99999', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (54, 35, 1, 'password', '1235', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (55, 35, 1, 'premises_type_', 'O', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (56, 35, 1, 'company___business_unit', 'test', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (57, 35, 1, 'occupancy_status', 'OCCUPIED', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (58, 35, 1, 'office_unit_no_', '1007', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (59, 35, 1, 'floor', '10', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (60, 35, 1, 'makani_no', '258965', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (61, 35, 1, 'plot_parcel_no', '555', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (62, 35, 1, 'po_box', 'sharjah post ofice ', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (63, 35, 1, 'access_notes', 'test', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (64, 35, 1, 'meeting_rooms_', '9', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (65, 35, 1, 'total_area', '500sq', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (66, 35, 1, 'seating_capacity', '50', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (67, 35, 1, 'pantry_kitchen', 'yes', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (68, 35, 1, 'washrooms', '3', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (69, 35, 1, 'reception', 'yes', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (70, 35, 1, 'internet_type_', 'fiber', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (71, 35, 1, 'power_capacity__kw_kva_', '88', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (72, 35, 1, 'parking_slots', '6', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (73, 35, 1, 'fit_out_level', 'shell', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (74, 35, 1, 'furniture_ownership', 'owned', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (75, 35, 1, 'mortgage_lien', '66', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (76, 35, 1, 'title_deed_no', '66', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (77, 35, 1, 'purchase_date', '10/11/2026', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (78, 35, 1, 'purchase_value_', '555', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (79, 35, 1, 'depreciation_method_', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (80, 35, 1, 'asset_capitalization_id', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (81, 35, 1, 'insurance', '555', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (82, 35, 1, 'insurance_coverage_type', 'building', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (83, 35, 1, 'building_management_approvals', '555', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (84, 35, 1, 'health___safety_inspection_schedule', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (85, 35, 1, 'civil_defense_certificate_no_', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (86, 35, 1, 'water_account_no', '555', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (87, 35, 1, 'chiller_district_cooling', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (88, 35, 1, 'electricity_provider', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (89, 35, 1, 'service_contracts', '55', '2026-02-02 12:22:48', '2026-02-02 12:22:48') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (90, 36, 1, 'country_id', '2', '2026-02-03 06:21:24', '2026-02-03 06:21:24') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (91, 36, 1, 'premises_type_id', '2', '2026-02-03 06:21:24', '2026-02-03 06:21:24') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (92, 36, 1, 'area', 'Free Zone', '2026-02-03 06:21:24', '2026-02-03 06:21:24') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (93, 37, 1, 'country_id', '2', '2026-02-03 08:20:59', '2026-02-03 08:20:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (94, 37, 1, 'property_type_id', '1', '2026-02-03 08:20:59', '2026-02-03 08:20:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (95, 37, 1, 'premises_type_id', '2', '2026-02-03 08:20:59', '2026-02-03 08:20:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (96, 37, 1, 'area', 'Free Zone', '2026-02-03 08:20:59', '2026-02-03 08:20:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (97, 38, 1, 'country_id', '2', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (98, 38, 1, 'property_type_id', '1', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (99, 38, 1, 'premises_type_id', '2', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (100, 38, 1, 'area', 'Free Zone', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (101, 38, 1, 'premises_id', 'test', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (102, 38, 1, 'primary_contact', 'test', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (103, 38, 1, 'legal_property', 'test', '2026-02-03 08:32:06', '2026-02-03 08:32:06') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (104, 39, 1, 'country_id', '2', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (105, 39, 1, 'property_type_id', '1', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (106, 39, 1, 'premises_type_id', '2', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (107, 39, 1, 'area', 'Free Zone', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (108, 39, 1, 'premises_id', '101', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (109, 39, 1, 'primary_contact', '999', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (110, 39, 1, 'legal_property', 'Clue Quest Task.docx', '2026-02-03 08:43:51', '2026-02-03 08:43:51') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (111, 40, 1, 'country_id', '1', '2026-02-03 08:52:59', '2026-02-03 08:52:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (112, 40, 1, 'property_type_id', '2', '2026-02-03 08:52:59', '2026-02-03 08:52:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (113, 40, 1, 'premises_type_id', '1', '2026-02-03 08:52:59', '2026-02-03 08:52:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (114, 40, 1, 'area', 'Free Zone', '2026-02-03 08:52:59', '2026-02-03 08:52:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (115, 40, 1, 'premises_id', '103', '2026-02-03 08:52:59', '2026-02-03 08:52:59') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (116, 41, 1, 'country_id', '1', '2026-02-03 09:11:09', '2026-02-03 09:11:09') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (117, 41, 1, 'property_type_id', '1', '2026-02-03 09:11:09', '2026-02-03 09:11:09') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (118, 41, 1, 'premises_type_id', '1', '2026-02-03 09:11:09', '2026-02-03 09:11:09') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (119, 41, 1, 'area', 'Main Land', '2026-02-03 09:11:09', '2026-02-03 09:11:09') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (120, 41, 1, 'premises_id', '107', '2026-02-03 09:11:09', '2026-02-03 09:11:09') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (121, 41, 31, 'country_id', '2', '2026-02-06 14:32:58.549132', '2026-02-06 14:32:58.549132') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (122, 41, 31, 'property_type_id', '1', '2026-02-06 14:32:58.549132', '2026-02-06 14:32:58.549132') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (123, 41, 31, 'premises_type_id', '2', '2026-02-06 14:32:58.549132', '2026-02-06 14:32:58.549132') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (124, 41, 31, 'area', 'Free Zone', '2026-02-06 14:32:58.549132', '2026-02-06 14:32:58.549132') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (125, 41, 31, 'new_test', 'tee', '2026-02-06 14:32:58.549132', '2026-02-06 14:32:58.549132') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (126, 42, 1, 'country_id', '1', '2026-02-17 09:31:26.701157', '2026-02-17 09:31:26.701157') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (127, 42, 1, 'property_type_id', '1', '2026-02-17 09:31:26.701157', '2026-02-17 09:31:26.701157') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (128, 42, 1, 'premises_type_id', '1', '2026-02-17 09:31:26.701157', '2026-02-17 09:31:26.701157') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (129, 42, 1, 'area', 'Main Land', '2026-02-17 09:31:26.701157', '2026-02-17 09:31:26.701157') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (130, 42, 1, 'file_', 'Premises_All_In_One_Table.xlsx', '2026-02-17 09:31:26.701157', '2026-02-17 09:31:26.701157') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (131, 42, 1, 'premises_id', 'uu', '2026-02-17 09:31:26.701157', '2026-02-17 09:31:26.701157') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (132, 43, 1, 'country_id', '1', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (133, 43, 1, 'property_type_id', '1', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (134, 43, 1, 'premises_type_id', '1', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (135, 43, 1, 'area', 'Main Land', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (136, 43, 1, 'file_', 'Premises_All_In_One_Table.xlsx', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (137, 43, 1, 'premises_id', 'uu', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (138, 43, 1, 'region', 'Abu Dhabi Emirate', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (139, 43, 1, 'test_file_', 'Screenshot 2026-02-23 155000.png', '2026-02-23 16:04:12.816944', '2026-02-23 16:04:12.816944') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (140, 44, 1, 'country_id', '2', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (141, 44, 1, 'region', 'Andaman and Nicobar Islands', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (142, 44, 1, 'property_type_id', '1', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (143, 44, 1, 'premises_type_id', '2', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (144, 44, 1, 'area', 'Free Zone', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (145, 44, 1, 'file_', 'mobile view.png', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (146, 44, 1, 'file__issue_date', '2026-02-23', '2026-02-23 16:23:52.161198', '2026-02-23 16:23:52.161198') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (147, 46, 1, 'country_id', '1', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (148, 46, 1, 'property_type_id', '1', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (149, 46, 1, 'premises_type_id', '1', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (150, 46, 1, 'area', 'Main Land', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (151, 46, 1, 'file_', 'Premises_All_In_One_Table.xlsx', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (152, 46, 1, 'premises_id', 'uu', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (153, 46, 1, 'test_file_', 'Vehilce Parameters.docx', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (154, 46, 1, 'autocheking', 'COMP-PR-26-02-100', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (155, 46, 1, 'test_id', 'COMP-PR-26-02-100', '2026-02-24 13:07:56.455419', '2026-02-24 13:07:56.455419') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (156, 48, 1, 'country_id', '2', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (157, 48, 1, 'property_type_id', '1', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (158, 48, 1, 'premises_type_id', '2', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (159, 48, 1, 'area', 'Free Zone', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (160, 48, 1, 'file_', 'mobile view.png', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (161, 48, 1, 'file__issue_date', '2026-02-23', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (162, 48, 1, 'autocheking', 'COMP-PR-26-02-101', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (163, 48, 1, 'test_id', 'COMP-PR-26-02-101', '2026-02-24 14:35:35.849114', '2026-02-24 14:35:35.849114') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (164, 49, 1, 'country_id', '2', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (165, 49, 1, 'property_type_id', '1', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (166, 49, 1, 'premises_type_id', '2', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (167, 49, 1, 'area', 'Free Zone', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (168, 49, 1, 'file_', 'Vehilce Parameters.docx', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (169, 49, 1, 'file__issue_date', '2026-02-24', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (170, 49, 1, 'autocheking', 'COMP-PR-26-02-102', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (171, 49, 1, 'test_id', 'COMP-PR-26-02-102', '2026-02-24 14:36:33.210328', '2026-02-24 14:36:33.210328') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (172, 50, 1, 'country_id', '2', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (173, 50, 1, 'property_type_id', '1', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (174, 50, 1, 'premises_type_id', '2', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (175, 50, 1, 'area', 'Free Zone', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (176, 50, 1, 'file_', 'Nurchemia - Keywords .xlsx', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (177, 50, 1, 'file__issue_date', '2026-02-24', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (178, 50, 1, 'autocheking', 'COMP-PR-26-02-102', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (179, 50, 1, 'test_id', 'COMP-PR-26-02-102', '2026-02-24 14:58:33.198119', '2026-02-24 14:58:33.198119') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (180, 51, 1, 'country_id', '2', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (181, 51, 1, 'property_type_id', '1', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (182, 51, 1, 'premises_type_id', '2', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (183, 51, 1, 'area', 'Free Zone', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (184, 51, 1, 'file_', 'Nurchemia - Keywords .xlsx', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (185, 51, 1, 'file__issue_date', '2026-02-24', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (186, 51, 1, 'autocheking', 'COMP-PR-26-02-103', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (187, 51, 1, 'test_id', 'COMP-PR-26-02-103', '2026-02-24 15:02:19.654529', '2026-02-24 15:02:19.654529') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (188, 52, 1, 'country_id', '2', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (189, 52, 1, 'property_type_id', '1', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (190, 52, 1, 'premises_type_id', '2', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (191, 52, 1, 'area', 'Free Zone', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (192, 52, 1, 'file_', 'Complete Drum Bitumen Seo Content.docx', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (193, 52, 1, 'file__issue_date', '2026-02-24', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (194, 52, 1, 'autocheking', 'COMP-PR-26-02-104', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (195, 52, 1, 'test_id', 'COMP-PR-26-02-104', '2026-02-24 15:05:54.469215', '2026-02-24 15:05:54.469215') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (196, 53, 1, 'country_id', '2', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (197, 53, 1, 'property_type_id', '1', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (198, 53, 1, 'premises_type_id', '2', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (199, 53, 1, 'area', 'Free Zone', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (200, 53, 1, 'file_', 'Bituroll On-Page V1.xlsx', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (201, 53, 1, 'file__issue_date', '2026-02-24', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (202, 53, 1, 'autocheking', 'COMP-PR-26-02-105', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (203, 53, 1, 'test_id', 'COMP-PR-26-02-105', '2026-02-24 15:11:33.652489', '2026-02-24 15:11:33.652489') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (204, 54, 1, 'country_id', '2', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (205, 54, 1, 'property_type_id', '1', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (206, 54, 1, 'premises_type_id', '2', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (207, 54, 1, 'area', 'Free Zone', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (208, 54, 1, 'file_', '/uploads/premises/p-26-02-24-100.xlsx', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (209, 54, 1, 'file__issue_date', '2026-02-24', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (210, 54, 1, 'autocheking', 'COMP-PR-26-02-106', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (211, 54, 1, 'test_id', 'COMP-PR-26-02-106', '2026-02-24 15:25:26.105319', '2026-02-24 15:25:26.105319') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (212, 55, 1, 'country_id', '2', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (213, 55, 1, 'property_type_id', '1', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (214, 55, 1, 'premises_type_id', '2', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (215, 55, 1, 'area', 'Free Zone', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (216, 55, 1, 'file_', '/uploads/premises/p-26-02-24-101.docx', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (217, 55, 1, 'file__issue_date', '2026-02-24', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (218, 55, 1, 'autocheking', 'COMP-PR-26-02-105', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (219, 55, 1, 'test_id', 'COMP-PR-26-02-105', '2026-02-24 15:26:36.264324', '2026-02-24 15:26:36.264324') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (220, 56, 1, 'country_id', '2', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (221, 56, 1, 'property_type_id', '1', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (222, 56, 1, 'premises_type_id', '2', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (223, 56, 1, 'area', 'Free Zone', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (224, 56, 1, 'file_', '/uploads/premises/premises-26-02-25-100.docx', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (225, 56, 1, 'file__issue_date', '2026-02-25', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (226, 56, 1, 'autocheking', 'TRAK-PR-26-02-100', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (227, 56, 1, 'test_id', 'TRAK-PR-26-02-100', '2026-02-25 09:35:15.322546', '2026-02-25 09:35:15.322546') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (228, 57, 1, 'country_id', '2', '2026-02-25 10:41:39.372839', '2026-02-25 10:41:39.372839') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (229, 57, 1, 'property_type_id', '1', '2026-02-25 10:41:39.372839', '2026-02-25 10:41:39.372839') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (230, 57, 1, 'premises_type_id', '2', '2026-02-25 10:41:39.372839', '2026-02-25 10:41:39.372839') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (231, 57, 1, 'area', 'Free Zone', '2026-02-25 10:41:39.372839', '2026-02-25 10:41:39.372839') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (232, 57, 1, 'autocheking', 'TRAK-PR-26-02-101', '2026-02-25 10:41:39.372839', '2026-02-25 10:41:39.372839') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (233, 57, 1, 'test_id', 'TRAK-PR-26-02-101', '2026-02-25 10:41:39.372839', '2026-02-25 10:41:39.372839') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (234, 58, 1, 'country_id', '2', '2026-02-25 10:50:08.263055', '2026-02-25 10:50:08.263055') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (235, 58, 1, 'property_type_id', '1', '2026-02-25 10:50:08.263055', '2026-02-25 10:50:08.263055') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (236, 58, 1, 'premises_type_id', '2', '2026-02-25 10:50:08.263055', '2026-02-25 10:50:08.263055') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (237, 58, 1, 'area', 'Free Zone', '2026-02-25 10:50:08.263055', '2026-02-25 10:50:08.263055') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (238, 58, 1, 'autocheking', 'TRAK-PR-26-02-102', '2026-02-25 10:50:08.263055', '2026-02-25 10:50:08.263055') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (239, 58, 1, 'test_id', 'TRAK-PR-26-02-102', '2026-02-25 10:50:08.263055', '2026-02-25 10:50:08.263055') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (240, 59, 1, 'country_id', '2', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (241, 59, 1, 'property_type_id', '1', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (242, 59, 1, 'premises_type_id', '2', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (243, 59, 1, 'area', 'Free Zone', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (244, 59, 1, 'file_', '/uploads/premises/premises-26-02-25-101.xlsx', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (245, 59, 1, 'file__issue_date', '2026-02-25', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (246, 59, 1, 'autocheking', 'TRAK-PR-26-02-103', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (247, 59, 1, 'test_id', 'TRAK-PR-26-02-103', '2026-02-25 10:57:18.324576', '2026-02-25 10:57:18.324576') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (248, 60, 1, 'test_id', 'TRAK-PR-26-02-104', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (249, 60, 1, 'autocheking', 'TRAK-PR-26-02-104', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (250, 60, 1, 'country_id', '2', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (251, 60, 1, 'property_type_id', '1', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (252, 60, 1, 'premises_type_id', '2', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (253, 60, 1, 'area', 'Free Zone', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (254, 60, 1, 'file_', '/uploads/premises/premises-26-02-25-102.xlsx', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (255, 60, 1, 'file__issue_date', '2026-02-25', '2026-02-25 11:06:16.474094', '2026-02-25 11:06:16.474094') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (256, 61, 1, 'autocheking', 'TRAK-PR-2026-02-100', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (257, 61, 1, 'test_id', 'TRAK-PR-2026-02-100', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (258, 61, 1, 'country_id', '2', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (259, 61, 1, 'property_type_id', '1', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (260, 61, 1, 'premises_type_id', '2', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (261, 61, 1, 'area', 'Free Zone', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (262, 61, 1, 'test_file__end_date', '2026-02-26', '2026-02-26 09:20:17.189239', '2026-02-26 09:20:17.189239') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (263, 62, 1, 'autocheking', 'TRAK-PR-26-02-105', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (264, 62, 1, 'test_id', 'TRAK-PR-26-02-105', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (265, 62, 1, 'country_id', '2', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (266, 62, 1, 'property_type_id', '1', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (267, 62, 1, 'premises_type_id', '2', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (268, 62, 1, 'area', 'Free Zone', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (269, 62, 1, 'test_file__end_date', '2026-02-26', '2026-02-26 09:40:26.971128', '2026-02-26 09:40:26.971128') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (270, 63, 1, 'autocheking', 'TRAK-PR-2026-02-100', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (271, 63, 1, 'test_id', 'TRAK-PR-2026-02-100', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (272, 63, 1, 'country_id', '2', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (273, 63, 1, 'property_type_id', '1', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (274, 63, 1, 'premises_type_id', '2', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (275, 63, 1, 'area', 'Free Zone', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (276, 63, 1, 'test_file__end_date', '2026-02-26', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (277, 63, 1, 'test_file_', '/uploads/premises/premises-26-02-26-100.docx', '2026-02-26 09:42:41.711643', '2026-02-26 09:42:41.711643') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (278, 64, 1, 'autocheking', 'TRAK-PR-26-02-106', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (279, 64, 1, 'test_id', 'TRAK-PR-26-02-106', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (280, 64, 1, 'country_id', '2', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (281, 64, 1, 'property_type_id', '1', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (282, 64, 1, 'premises_type_id', '2', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (283, 64, 1, 'area', 'Free Zone', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (284, 64, 1, 'test_file_', '/uploads/premises/premises-26-02-26-101.docx', '2026-02-26 09:43:53.132904', '2026-02-26 09:43:53.132904') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (285, 65, 1, 'autocheking', 'TRAK-PR-26-02-107', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (286, 65, 1, 'test_id', 'TRAK-PR-26-02-107', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (287, 65, 1, 'country_id', '2', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (288, 65, 1, 'property_type_id', '1', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (289, 65, 1, 'premises_type_id', '2', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (290, 65, 1, 'area', 'Free Zone', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (291, 65, 1, 'test_file_', '/uploads/premises/premises-26-02-26-102.jpg', '2026-02-26 09:44:48.14799', '2026-02-26 09:44:48.14799') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (292, 66, 1, 'autocheking', 'TRAK-PR-26-02-108', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (293, 66, 1, 'test_id', 'TRAK-PR-26-02-108', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (294, 66, 1, 'country_id', '2', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (295, 66, 1, 'property_type_id', '1', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (296, 66, 1, 'premises_type_id', '2', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (297, 66, 1, 'area', 'Free Zone', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (298, 66, 1, 'test_file_', '/uploads/premises/premises-26-02-26-103.xlsx', '2026-02-26 10:07:21.475038', '2026-02-26 10:07:21.475038') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (299, 67, 1, 'autocheking', 'TRAK-PR-26-02-26-100', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (300, 67, 1, 'test_id', 'TRAK-PR-26-02-26-100', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (301, 67, 1, 'country_id', '2', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (302, 67, 1, 'property_type_id', '1', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (303, 67, 1, 'premises_type_id', '2', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (304, 67, 1, 'area', 'Free Zone', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (305, 67, 1, 'test_file_', '/uploads/premises/premises-26-02-26-104.php', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (306, 67, 1, 'test_file__end_date', '2026-02-26', '2026-02-26 11:17:48.000788', '2026-02-26 11:17:48.000788') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (307, 68, 1, 'autocheking', 'TRAK-PR-2026-02-26-100', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (308, 68, 1, 'test_id', 'TRAK-PR-2026-02-26-100', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (309, 68, 1, 'country_id', '2', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (310, 68, 1, 'property_type_id', '1', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (311, 68, 1, 'premises_type_id', '2', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (312, 68, 1, 'area', 'Free Zone', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (313, 68, 1, 'dropdown_testing_', 'book_shelf', '2026-02-26 11:45:00.759378', '2026-02-26 11:45:00.759378') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (314, 69, 1, 'country_id', '2', '2026-03-04 16:43:37.384765', '2026-03-04 16:43:37.384765') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (315, 69, 1, 'area', 'All', '2026-03-04 16:43:37.384765', '2026-03-04 16:43:37.384765') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (316, 69, 1, 'dropdown_testing_', 'chair_', '2026-03-04 16:43:37.384765', '2026-03-04 16:43:37.384765') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (317, 69, 1, 'autocheking', 'TRAK-PR-2026-03-04-100', '2026-03-04 16:43:37.384765', '2026-03-04 16:43:37.384765') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (318, 69, 1, 'test_id', 'TRAK-PR-2026-03-04-100', '2026-03-04 16:43:37.384765', '2026-03-04 16:43:37.384765') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (319, 73, 85, 'name', '', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (320, 73, 85, 'country_id', '2', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (321, 73, 85, 'country_name', 'India', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (322, 73, 85, 'property_type_id', '8', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (323, 73, 85, 'property_type_name', 'All', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (324, 73, 85, 'premises_type_id', '3', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (325, 73, 85, 'premises_type_name', 'All', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (326, 73, 85, 'area_name', 'All', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (327, 73, 85, 'autocheking', 'PR-2026-07-03-001', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (328, 73, 85, 'test_id', 'PR-2026-07-03-001', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (329, 73, 85, 'id_', 'PR-2026-07-03-001', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (330, 73, 85, 'upload', '/uploads/premises/premises-2026-03-07-100.docx - 539', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (331, 73, 85, 'upload_name', 'PR 2026-03-07 - asst.docx - 539', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (332, 73, 85, 'area', 'All', '2026-03-07 11:31:12.235369', '2026-03-07 11:31:12.235369') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (333, 74, 85, 'name', '', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (334, 74, 85, 'country_id', '2', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (335, 74, 85, 'country_name', 'India', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (336, 74, 85, 'property_type_id', '8', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (337, 74, 85, 'property_type_name', 'All', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (338, 74, 85, 'premises_type_id', '3', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (339, 74, 85, 'premises_type_name', 'All', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (340, 74, 85, 'area_name', 'All', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (341, 74, 85, 'autocheking', 'PR-2026-07-03-002', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (342, 74, 85, 'test_id', 'PR-2026-07-03-002', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (343, 74, 85, 'id_', 'PR-2026-07-03-002', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (344, 74, 85, 'upload', '/uploads/premises/premises-2026-03-07-101.xlsx - 172', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (345, 74, 85, 'upload_name', 'PR 2026-03-07 - Vehicle_Module_FieldSets (1).xlsx - 172', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (346, 74, 85, 'area', 'All', '2026-03-07 11:31:35.36289', '2026-03-07 11:31:35.36289') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (347, 75, 1, 'name', '', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (348, 75, 1, 'country_id', '2', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (349, 75, 1, 'country_name', 'India', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (350, 75, 1, 'property_type_id', '8', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (351, 75, 1, 'property_type_name', 'All', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (352, 75, 1, 'premises_type_id', '3', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (353, 75, 1, 'premises_type_name', 'All', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (354, 75, 1, 'area_name', 'All', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (355, 75, 1, 'area', 'All', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (356, 75, 1, 'autocheking', 'PR-2026-07-03-001', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (357, 75, 1, 'test_id', 'PR-2026-07-03-001', '2026-03-07 11:44:53.989707', '2026-03-07 11:44:53.989707') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (358, 76, 1, 'name', '', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (359, 76, 1, 'country_id', '2', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (360, 76, 1, 'country_name', 'India', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (361, 76, 1, 'property_type_id', '8', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (362, 76, 1, 'property_type_name', 'All', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (363, 76, 1, 'premises_type_id', '3', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (364, 76, 1, 'premises_type_name', 'All', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (365, 76, 1, 'area_name', 'All', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (366, 76, 1, 'area', 'All', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (367, 76, 1, 'autocheking', 'PR-2026-07-03-003', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (368, 76, 1, 'test_id', 'PR-2026-07-03-003', '2026-03-07 11:49:18.466446', '2026-03-07 11:49:18.466446') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (369, 77, 1, 'name', '', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (370, 77, 1, 'country_id', '2', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (371, 77, 1, 'country_name', 'India', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (372, 77, 1, 'property_type_id', '8', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (373, 77, 1, 'property_type_name', 'All', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (374, 77, 1, 'premises_type_id', '3', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (375, 77, 1, 'premises_type_name', 'All', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (376, 77, 1, 'area_name', 'All', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (377, 77, 1, 'id_', 'PR-2026-07-03-003', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (378, 77, 1, 'upload', '/uploads/premises/premises-2026-03-07-100.txt - 967', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (379, 77, 1, 'upload_name', 'PR 2026-03-07 - Reference link.txt - 967', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (380, 77, 1, 'area', 'All', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (381, 77, 1, 'autocheking', 'PR-2026-07-03-004', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (382, 77, 1, 'test_id', 'PR-2026-07-03-004', '2026-03-07 11:50:02.98221', '2026-03-07 11:50:02.98221') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (383, 78, 1, 'name', '', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (384, 78, 1, 'country_id', '2', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (385, 78, 1, 'country_name', 'India', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (386, 78, 1, 'property_type_id', '8', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (387, 78, 1, 'property_type_name', 'All', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (388, 78, 1, 'premises_type_id', '3', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (389, 78, 1, 'premises_type_name', 'All', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (390, 78, 1, 'area_name', 'All', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (391, 78, 1, 'id_', 'PR-2026-07-03-004', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (392, 78, 1, 'upload', '/uploads/premises/premises-2026-03-07-101.txt - 605', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (393, 78, 1, 'upload_name', 'PR 2026-03-07 - p-.txt - 605', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (394, 78, 1, 'area', 'All', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (395, 78, 1, 'autocheking', 'PR-2026-07-03-005', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (396, 78, 1, 'test_id', 'PR-2026-07-03-005', '2026-03-07 11:50:36.54539', '2026-03-07 11:50:36.54539') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (397, 79, 1, 'name', '', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (398, 79, 1, 'country_id', '2', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (399, 79, 1, 'country_name', 'India', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (400, 79, 1, 'property_type_id', '8', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (401, 79, 1, 'property_type_name', 'All', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (402, 79, 1, 'premises_type_id', '3', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (403, 79, 1, 'premises_type_name', 'All', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (404, 79, 1, 'area_name', 'All', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (405, 79, 1, 'area', 'All', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (406, 79, 1, 'autocheking', 'PR-2026-07-03-006', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (407, 79, 1, 'test_id', 'PR-2026-07-03-006', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (408, 79, 1, 'id_pri', 'PR-2026-07-03-006', '2026-03-07 13:05:55.9501', '2026-03-07 13:05:55.9501') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (409, 80, 1, 'name', '', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (410, 80, 1, 'country_id', '2', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (411, 80, 1, 'country_name', 'India', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (412, 80, 1, 'property_type_id', '1', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (413, 80, 1, 'property_type_name', 'Owned', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (414, 80, 1, 'premises_type_id', '3', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (415, 80, 1, 'premises_type_name', 'All', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (416, 80, 1, 'area_name', 'All', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (417, 80, 1, 'id_pri', 'PR-2026-07-03-007', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (418, 80, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-102.docx - 371', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (419, 80, 1, 'file_stoing_now__name', 'PR 2026-03-07 - Vehilce Parameters.docx - 371', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (420, 80, 1, 'file_stoing_now__issue_date', '2026-03-16', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (421, 80, 1, 'file_stoing_now__end_date', '2026-03-09', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (422, 80, 1, 'area', 'All', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (423, 80, 1, 'autocheking', 'PR-2026-07-03-007', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (424, 80, 1, 'test_id', 'PR-2026-07-03-007', '2026-03-07 13:08:20.368826', '2026-03-07 13:08:20.368826') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (425, 81, 1, 'name', '', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (426, 81, 1, 'country_id', '2', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (427, 81, 1, 'country_name', 'India', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (428, 81, 1, 'property_type_id', '1', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (429, 81, 1, 'property_type_name', 'Owned', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (430, 81, 1, 'premises_type_id', '3', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (431, 81, 1, 'premises_type_name', 'All', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (432, 81, 1, 'area_name', 'All', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (433, 81, 1, 'id_pri', 'PR-2026-07-03-007', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (434, 81, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-102.docx - 371', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (435, 81, 1, 'file_stoing_now__name', 'PR 2026-03-07 - Vehilce Parameters.docx - 371', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (436, 81, 1, 'file_stoing_now__issue_date', '2026-03-11', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (437, 81, 1, 'file_stoing_now__end_date', '2026-03-09', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (438, 81, 1, 'autocheking', 'PR-2026-07-03-007', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (439, 81, 1, 'test_id', 'PR-2026-07-03-007', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (440, 81, 1, 'area', 'All', '2026-03-07 14:23:36.778888', '2026-03-07 14:23:36.778888') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (441, 82, 1, 'name', '', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (442, 82, 1, 'country_id', '2', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (443, 82, 1, 'country_name', 'India', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (444, 82, 1, 'property_type_id', '1', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (445, 82, 1, 'property_type_name', 'Owned', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (446, 82, 1, 'premises_type_id', '3', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (447, 82, 1, 'premises_type_name', 'All', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (448, 82, 1, 'area_name', 'All', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (449, 82, 1, 'id_pri', 'PR-2026-07-03-007', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (450, 82, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-102.docx - 371', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (451, 82, 1, 'file_stoing_now__name', 'PR 2026-03-07 - Vehilce Parameters.docx - 371', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (452, 82, 1, 'file_stoing_now__issue_date', '2026-03-11', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (453, 82, 1, 'file_stoing_now__end_date', '2026-03-09', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (454, 82, 1, 'autocheking', 'PR-2026-07-03-007', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (455, 82, 1, 'test_id', 'PR-2026-07-03-007', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (456, 82, 1, 'area', 'All', '2026-03-07 14:23:42.318842', '2026-03-07 14:23:42.318842') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (457, 83, 1, 'name', '', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (458, 83, 1, 'country_id', '2', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (459, 83, 1, 'country_name', 'India', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (460, 83, 1, 'property_type_id', '8', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (461, 83, 1, 'property_type_name', 'All', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (462, 83, 1, 'premises_type_id', '3', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (463, 83, 1, 'premises_type_name', 'All', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (464, 83, 1, 'area_name', 'All', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (465, 83, 1, 'area', 'All', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (466, 83, 1, 'autocheking', 'PR-2026-07-03-008', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (467, 83, 1, 'test_id', 'PR-2026-07-03-008', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (468, 83, 1, 'id_pri', 'PR-2026-07-03-008', '2026-03-07 14:26:11.431843', '2026-03-07 14:26:11.431843') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (469, 84, 1, 'name', '', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (470, 84, 1, 'country_id', '2', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (471, 84, 1, 'country_name', 'India', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (472, 84, 1, 'property_type_id', '8', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (473, 84, 1, 'property_type_name', 'All', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (474, 84, 1, 'premises_type_id', '2', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (475, 84, 1, 'premises_type_name', 'Office', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (476, 84, 1, 'area_name', 'All', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (477, 84, 1, 'id_', 'PR-2026-07-03-009', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (478, 84, 1, 'premises_type_', 'uuu', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (479, 84, 1, 'area', 'All', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (480, 84, 1, 'autocheking', 'PR-2026-07-03-009', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (481, 84, 1, 'test_id', 'PR-2026-07-03-009', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (482, 84, 1, 'id_pri', 'PR-2026-07-03-009', '2026-03-07 14:28:57.305179', '2026-03-07 14:28:57.305179') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (483, 85, 1, 'name', '', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (484, 85, 1, 'country_id', '2', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (485, 85, 1, 'country_name', 'India', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (486, 85, 1, 'property_type_id', '8', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (487, 85, 1, 'property_type_name', 'All', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (488, 85, 1, 'premises_type_id', '1', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (489, 85, 1, 'premises_type_name', 'Warehouse', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (490, 85, 1, 'area_name', 'All', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (491, 85, 1, 'id_pri', 'PR-2026-07-03-010', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (492, 85, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-103.docx - 344', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (493, 85, 1, 'file_stoing_now__name', 'PR 2026-03-07 - Vehilce Parameters (1).docx - 344', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (494, 85, 1, 'file_stoing_now__issue_date', '2026-03-09', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (495, 85, 1, 'file_stoing_now__end_date', '2026-03-16', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (496, 85, 1, 'area', 'All', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (497, 85, 1, 'autocheking', 'PR-2026-07-03-010', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (498, 85, 1, 'test_id', 'PR-2026-07-03-010', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (499, 85, 1, 'id_', 'PR-2026-07-03-010', '2026-03-07 14:48:47.772991', '2026-03-07 14:48:47.772991') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (500, 86, 1, 'name', '', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (501, 86, 1, 'country_id', '2', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (502, 86, 1, 'country_name', 'India', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (503, 86, 1, 'property_type_id', '8', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (504, 86, 1, 'property_type_name', 'All', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (505, 86, 1, 'premises_type_id', '1', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (506, 86, 1, 'premises_type_name', 'Warehouse', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (507, 86, 1, 'area_name', 'All', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (508, 86, 1, 'id_', 'PR-2026-07-03-011', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (509, 86, 1, 'id_pri', 'PR-2026-07-03-011', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (510, 86, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-104.docx - 732', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (511, 86, 1, 'file_stoing_now__name', 'PR 2026-03-07 - asst.docx - 732', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (512, 86, 1, 'file_stoing_now__issue_date', '2026-03-03', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (513, 86, 1, 'file_stoing_now__end_date', '2026-03-09', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (514, 86, 1, 'area', 'All', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (515, 86, 1, 'autocheking', 'PR-2026-07-03-011', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (516, 86, 1, 'test_id', 'PR-2026-07-03-011', '2026-03-07 14:58:32.605774', '2026-03-07 14:58:32.605774') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (517, 87, 1, 'name', '', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (518, 87, 1, 'country_id', '2', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (519, 87, 1, 'country_name', 'India', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (520, 87, 1, 'property_type_id', '8', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (521, 87, 1, 'property_type_name', 'All', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (522, 87, 1, 'premises_type_id', '3', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (523, 87, 1, 'premises_type_name', 'All', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (524, 87, 1, 'area_name', 'All', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (525, 87, 1, 'area', 'All', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (526, 87, 1, 'autocheking', 'PR-2026-07-03-012', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (527, 87, 1, 'test_id', 'PR-2026-07-03-012', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (528, 87, 1, 'id_pri', 'PR-2026-07-03-012', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (529, 87, 1, 'id_', 'PR-2026-07-03-012', '2026-03-07 15:01:13.796736', '2026-03-07 15:01:13.796736') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (530, 88, 1, 'name', '', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (531, 88, 1, 'country_id', '2', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (532, 88, 1, 'country_name', 'India', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (533, 88, 1, 'property_type_id', '8', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (534, 88, 1, 'property_type_name', 'All', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (535, 88, 1, 'premises_type_id', '1', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (536, 88, 1, 'premises_type_name', 'Warehouse', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (537, 88, 1, 'area_name', 'All', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (538, 88, 1, 'id_', 'PR-2026-07-03-013', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (539, 88, 1, 'id_pri', 'PR-2026-07-03-013', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (540, 88, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-105.docx - 125', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (541, 88, 1, 'file_stoing_now__name', 'PR 2026-03-07 - asst.docx - 125', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (542, 88, 1, 'file_stoing_now__issue_date', '2026-03-10', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (543, 88, 1, 'file_stoing_now__end_date', '2026-03-11', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (544, 88, 1, 'area', 'All', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (545, 88, 1, 'autocheking', 'PR-2026-07-03-013', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (546, 88, 1, 'test_id', 'PR-2026-07-03-013', '2026-03-07 15:01:35.264535', '2026-03-07 15:01:35.264535') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (547, 89, 1, 'name', '', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (548, 89, 1, 'country_id', '2', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (549, 89, 1, 'country_name', 'India', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (550, 89, 1, 'property_type_id', '8', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (551, 89, 1, 'property_type_name', 'All', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (552, 89, 1, 'premises_type_id', '1', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (553, 89, 1, 'premises_type_name', 'Warehouse', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (554, 89, 1, 'area_name', 'All', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (555, 89, 1, 'id_', 'PR-2026-07-03-013', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (556, 89, 1, 'id_pri', 'PR-2026-07-03-013', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (557, 89, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-105.docx - 125', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (558, 89, 1, 'file_stoing_now__name', 'PR 2026-03-07 - asst.docx - 125', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (559, 89, 1, 'file_stoing_now__issue_date', '2026-03-30', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (560, 89, 1, 'file_stoing_now__end_date', '2026-03-11', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (561, 89, 1, 'autocheking', 'PR-2026-07-03-013', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (562, 89, 1, 'test_id', 'PR-2026-07-03-013', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (563, 89, 1, 'area', 'All', '2026-03-07 15:02:30.018237', '2026-03-07 15:02:30.018237') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (564, 90, 1, 'name', '', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (565, 90, 1, 'country_id', '2', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (566, 90, 1, 'country_name', 'India', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (567, 90, 1, 'property_type_id', '8', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (568, 90, 1, 'property_type_name', 'All', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (569, 90, 1, 'premises_type_id', '3', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (570, 90, 1, 'premises_type_name', 'All', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (571, 90, 1, 'area_name', 'Main Land', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (572, 90, 1, 'area', 'Main Land', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (573, 90, 1, 'autocheking', 'PR-2026-07-03-014', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (574, 90, 1, 'test_id', 'PR-2026-07-03-014', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (575, 90, 1, 'id_pri', 'PR-2026-07-03-014', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (576, 90, 1, 'id_', 'PR-2026-07-03-014', '2026-03-07 15:03:58.040562', '2026-03-07 15:03:58.040562') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (577, 91, 1, 'name', '', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (578, 91, 1, 'country_id', '2', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (579, 91, 1, 'country_name', 'India', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (580, 91, 1, 'property_type_id', '1', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (581, 91, 1, 'property_type_name', 'Owned', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (582, 91, 1, 'premises_type_id', '3', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (583, 91, 1, 'premises_type_name', 'All', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (584, 91, 1, 'area_name', 'Main Land', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (585, 91, 1, 'id_pri', 'PR-2026-07-03-015', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (586, 91, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-106.docx - 220', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (587, 91, 1, 'file_stoing_now__name', 'PR 2026-03-07 - asst.docx - 220', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (588, 91, 1, 'file_stoing_now__issue_date', '2026-03-23', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (589, 91, 1, 'file_stoing_now__end_date', '2026-03-24', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (590, 91, 1, 'area', 'Main Land', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (591, 91, 1, 'autocheking', 'PR-2026-07-03-015', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (592, 91, 1, 'test_id', 'PR-2026-07-03-015', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (593, 91, 1, 'id_', 'PR-2026-07-03-015', '2026-03-07 15:05:18.527101', '2026-03-07 15:05:18.527101') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (594, 92, 1, 'name', '', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (595, 92, 1, 'country_id', '2', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (596, 92, 1, 'country_name', 'India', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (597, 92, 1, 'property_type_id', '1', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (598, 92, 1, 'property_type_name', 'Owned', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (599, 92, 1, 'premises_type_id', '3', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (600, 92, 1, 'premises_type_name', 'All', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (601, 92, 1, 'area_name', 'Main Land', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (602, 92, 1, 'id_pri', 'PR-2026-07-03-015', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (603, 92, 1, 'file_stoing_now_', '/uploads/premises/premises-2026-03-07-106.docx - 220', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (604, 92, 1, 'file_stoing_now__name', 'PR 2026-03-07 - asst.docx - 220', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (605, 92, 1, 'file_stoing_now__issue_date', '2026-03-23', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (606, 92, 1, 'file_stoing_now__end_date', '2026-03-24', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (607, 92, 1, 'autocheking', 'PR-2026-07-03-015', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (608, 92, 1, 'test_id', 'PR-2026-07-03-015', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (609, 92, 1, 'id_', 'PR-2026-07-03-015', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (610, 92, 1, 'area', 'Main Land', '2026-03-09 11:05:16.44394', '2026-03-09 11:05:16.44394') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (611, 93, 1, 'name', '', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (612, 93, 1, 'country_id', '2', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (613, 93, 1, 'country_name', 'India', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (614, 93, 1, 'property_type_id', '8', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (615, 93, 1, 'property_type_name', 'All', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (616, 93, 1, 'premises_type_id', '3', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (617, 93, 1, 'premises_type_name', 'All', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (618, 93, 1, 'area_name', 'All', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (619, 93, 1, 'emirate', 'kui', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (620, 93, 1, 'area', 'All', '2026-04-06 12:58:18.173579', '2026-04-06 12:58:18.173579') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (621, 94, 1, 'name', '', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (622, 94, 1, 'country_id', '1', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (623, 94, 1, 'country_name', 'UAE', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (624, 94, 1, 'property_type_id', '8', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (625, 94, 1, 'property_type_name', 'All', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (626, 94, 1, 'premises_type_id', '3', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (627, 94, 1, 'premises_type_name', 'All', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (628, 94, 1, 'area_name', 'All', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (629, 94, 1, 'rtrert', 'uikuiu', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (630, 94, 1, 'area', 'All', '2026-04-06 15:39:09.059817', '2026-04-06 15:39:09.059817') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (631, 95, 1, 'name', '', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (632, 95, 1, 'country_id', '1', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (633, 95, 1, 'country_name', 'UAE', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (634, 95, 1, 'property_type_id', '1', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (635, 95, 1, 'property_type_name', 'Owned', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (636, 95, 1, 'premises_type_id', '2', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (637, 95, 1, 'premises_type_name', 'Office', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (638, 95, 1, 'area_name', 'Free Zone', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (639, 95, 1, 'id_', '/uploads/premises/premises-2026-04-07-100.png - 190', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (640, 95, 1, 'id__name', 'PR 2026-04-07 - mobile view.png - 190', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (641, 95, 1, 'test', '99', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (642, 95, 1, 'area', 'Free Zone', '2026-04-07 10:05:09.76011', '2026-04-07 10:05:09.76011') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (643, 96, 1, 'name', '', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (644, 96, 1, 'country_id', '1', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (645, 96, 1, 'country_name', 'UAE', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (646, 96, 1, 'property_type_id', '8', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (647, 96, 1, 'property_type_name', 'All', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (648, 96, 1, 'premises_type_id', '2', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (649, 96, 1, 'premises_type_name', 'Office', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (650, 96, 1, 'area_name', 'Free Zone', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (651, 96, 1, 'rttrtrrre', 'PR-2026-07-04-001', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (652, 96, 1, 'rrr', 'rrr', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (653, 96, 1, 'test', 'ytyy', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (654, 96, 1, 'area', 'Free Zone', '2026-04-07 10:28:40.030271', '2026-04-07 10:28:40.030271') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (655, 97, 1, 'name', '', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (656, 97, 1, 'country_id', '1', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (657, 97, 1, 'country_name', 'UAE', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (658, 97, 1, 'property_type_id', '8', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (659, 97, 1, 'property_type_name', 'All', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (660, 97, 1, 'premises_type_id', '2', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (661, 97, 1, 'premises_type_name', 'Office', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (662, 97, 1, 'area_name', 'Free Zone', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (663, 97, 1, 'rttrtrrre', 'PR-2026-07-04-002', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (664, 97, 1, 'ytty', 'tytytyt', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (665, 97, 1, 'area', 'Free Zone', '2026-04-07 10:39:04.513553', '2026-04-07 10:39:04.513553') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (666, 98, 1, 'name', '', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (667, 98, 1, 'country_id', '1', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (668, 98, 1, 'country_name', 'UAE', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (669, 98, 1, 'property_type_id', '8', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (670, 98, 1, 'property_type_name', 'All', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (671, 98, 1, 'premises_type_id', '2', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (672, 98, 1, 'premises_type_name', 'Office', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (673, 98, 1, 'area_name', 'Free Zone', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (674, 98, 1, 'rttrtrrre', 'PR-2026-07-04-003', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (675, 98, 1, 'id_', '/uploads/premises/premises-2026-04-07-101.png - 759', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (676, 98, 1, 'id__name', 'PR 2026-04-07 - mobile view.png - 759', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (677, 98, 1, 'rrr', 'yujy', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (678, 98, 1, 'ytty', 'tytytyt', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (679, 98, 1, 'test', 'ugug', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_module_details VALUES (680, 98, 1, 'area', 'Free Zone', '2026-04-07 11:52:23.503525', '2026-04-07 11:52:23.503525') ON CONFLICT DO NOTHING;


--
-- TOC entry 5539 (class 0 OID 20699)
-- Dependencies: 277
-- Data for Name: premises_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.premises_types VALUES (1, 'Warehouse') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_types VALUES (2, 'Office') ON CONFLICT DO NOTHING;
INSERT INTO public.premises_types VALUES (3, 'All') ON CONFLICT DO NOTHING;


--
-- TOC entry 5541 (class 0 OID 20708)
-- Dependencies: 279
-- Data for Name: property_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.property_types VALUES (1, 'Owned') ON CONFLICT DO NOTHING;
INSERT INTO public.property_types VALUES (2, 'Rental') ON CONFLICT DO NOTHING;
INSERT INTO public.property_types VALUES (8, 'All') ON CONFLICT DO NOTHING;


--
-- TOC entry 5563 (class 0 OID 74644)
-- Dependencies: 301
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.regions VALUES (1, 'All') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (8, 'Abu Dhabi') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (9, 'Dubai') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (10, 'Sharjah') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (11, 'Ajman') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (12, 'Umm Al Quwain') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (13, 'Ras Al Khaimah') ON CONFLICT DO NOTHING;
INSERT INTO public.regions VALUES (14, 'Fujairah') ON CONFLICT DO NOTHING;


--
-- TOC entry 5557 (class 0 OID 32818)
-- Dependencies: 295
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_permissions VALUES (50, 5, 'dashboard', true, false, false, false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions VALUES (51, 5, 'assetdisplay', false, false, false, false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions VALUES (52, 5, 'vehicledisplay', false, false, false, false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions VALUES (53, 5, 'employees', false, false, false, false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions VALUES (54, 5, 'maintenance', false, false, false, false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions VALUES (55, 5, 'reports', false, false, false, false, false) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions VALUES (56, 5, 'moduleshome', false, false, false, false, false) ON CONFLICT DO NOTHING;


--
-- TOC entry 5555 (class 0 OID 32797)
-- Dependencies: 293
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.roles VALUES (5, 1, 'Aliya ', '', true, '2026-05-01 11:47:51.335707+04', '2026-05-01 11:47:51.335707+04') ON CONFLICT DO NOTHING;


--
-- TOC entry 5553 (class 0 OID 32774)
-- Dependencies: 291
-- Data for Name: smtp_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.smtp_configs VALUES (2, 'hhhh', 'smtp.gmail.com', 587, 'ashishvishnupriya7413@gmail.com', 'rsay uspo swtf gerx', 'tls', 'vishnupriyaashish9624@gmail.com', '', '', true, '2026-02-18 09:58:07.112074', '2026-02-18 11:17:07.507168', true, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5561 (class 0 OID 40988)
-- Dependencies: 299
-- Data for Name: status_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.status_master VALUES (2, 'ACTIVE') ON CONFLICT DO NOTHING;
INSERT INTO public.status_master VALUES (3, 'INACTIVE') ON CONFLICT DO NOTHING;


--
-- TOC entry 5543 (class 0 OID 20717)
-- Dependencies: 281
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (7, 12, 'Seira Hena', 'seira.admin@globallogistics.com', '$2b$10$r7eRjMQnZt1PpaCQJxG7Zupim/wnLvqEFvBTWx4bzn1Ena253y75S', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-05 12:03:21.873221', '2026-02-05 12:03:21.873221', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (8, 14, 'werwer', 'ewrew', '$2b$10$FD6ywcKwtxkHCXPRsOa9CuCZNvXn605x2MtMiDEGNCdPcomOvQ3J.', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-05 12:55:09.332021', '2026-02-05 12:55:09.332021', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (10, 16, 'Sameer', 'Sameer@gmail.com', '$2b$10$5F2xkRChYeXQ/up7NLO0oO0q8wFCZP0DPWm9JIPyXPcD/834cAtkG', 'EMPLOYEE', 'ACTIVE', '2026-02-05 15:31:51.514031', '2026-02-05 15:31:51.514031', 8, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (91, 101, ',okok', 'nuroilsocial@gmail.com', '$2b$10$SVAbFxBkwuC1CNveoNroD.56twM6roNVsKVrZZzfLJTDB9Xza.J6O', 'EMPLOYEE', 'ACTIVE', '2026-04-12 12:08:06.170902', '2026-04-12 12:08:06.170902', 41, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (35, 66, 'abc', 'a@gmail.com', '$2b$10$910kcPkE2sqK8Dq6z6yFG.xHvvvtUVI0l3I4/oGb3JSQeFmshZl5e', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 15:03:12.165319', '2026-02-17 15:03:12.165319', 27, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (36, 66, 'Admin', 'admin@hhughghhg.com', '$2b$10$Zx8p5LnSBkv6sZF4Fzq0IuVFGi01OgH.DbbsPNcA8BFfCRf3YcaA2', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 15:22:43.193565', '2026-02-17 15:22:43.193565', 27, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (37, 67, 'manu', 'manu@gmail', '$2b$10$k7W26aO22trXjpLtEW8PoejMcbdOARI2IofK9.oiqT8O3ceCmYOmS', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 15:46:05.97906', '2026-02-17 15:46:05.97906', 28, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (39, 69, 'meenu', 'vishnupriyaashish2496@gmail.com', '$2b$10$jBvilHM8nonRlCWjsp8rn.x6acuVFv6PvmGhQrNtjRoodnjE026iq', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 09:51:07.453868', '2026-02-18 09:51:07.453868', 30, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (22, 43, 'jj', 'yy', '$2b$10$Kp2Un3n80BEEpMonWrxpAOxXgqjrDLhFsn78LHhVSunkSrXUnLtMC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-13 16:24:10.351681', '2026-02-13 16:24:10.351681', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (92, 102, ',okok', 'nuroilsocial@gmail.com', '$2b$10$Fc0meRebwqTSkZfK9.Gp1eDrTVTh.Kl7BFJZI.CY30zIqNj2XD3HG', 'EMPLOYEE', 'ACTIVE', '2026-04-12 12:08:06.170902', '2026-04-12 12:08:06.170902', 41, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (87, 101, 'Satheesh', 'ops@nuragro.com', '$2b$10$1bPQtaD9ppw6tgaJw72kqeaRCsdZXbgRVwp95aiqMwaoet2CH2/OC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-11 17:05:11.881142', '2026-04-11 17:05:11.881142', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (48, 77, 'Arsha', 'vishnupriya312@gmail.com', '$2b$10$x8BVzWortqRG7KEiUNYuQeKxxrCdt4pmVQotwgsr0evQEQtZKql.u', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 14:37:58.498157', '2026-02-18 14:37:58.498157', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (57, 82, 'dsrestr', 'ew@fdtf.com', '$2b$10$vl1mo0aPhmptGOY9L9BZ.uB.duOBK/k.8YweutmmMHTLR3HcdrQKi', 'EMPLOYEE', 'ACTIVE', '2026-02-19 15:15:14.996802', '2026-02-19 15:15:14.996802', 36, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (58, 82, 'rtre', 'ds@etet.com', '$2b$10$KMkBZ.6X2kSE0DjSfwKYyulRzR9QVB1H97tZKymNJ4ayNamvfQXVq', 'EMPLOYEE', 'ACTIVE', '2026-02-19 15:16:13.745943', '2026-02-19 15:16:13.745943', 36, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (59, 82, 'John Smith', 'rincy@nurac.com', '$2b$10$eCyUPyzcF4X4LSBmqv7snO0H6ZXKlUAK7HNcip7.GbGuPqSHQC6F2', 'EMPLOYEE', 'ACTIVE', '2026-02-19 15:16:54.183579', '2026-02-19 15:16:54.183579', 36, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (60, 82, 'test', 'AlexJohnson@267', '$2b$10$GK0sIR5xZe/6IiqdW.GrrO3CHFTq3rvDyQ5LYaqVdJ2p34..34bgS', 'EMPLOYEE', 'ACTIVE', '2026-02-19 15:22:52.631367', '2026-02-19 15:22:52.631367', 36, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (38, 68, 'vi', 'ashishvishnupriya7413@gmail.com', '$2b$10$OHU4DUIMtiSqZu5aIxINw.qQXSH6YK5gB/fa48ny3cqGStpfmyxnS', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 17:16:30.389681', '2026-02-17 17:16:30.389681', 29, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (40, 70, 'sona', 'ashishvishnupriya7413@gmail.com', '$2b$10$OHU4DUIMtiSqZu5aIxINw.qQXSH6YK5gB/fa48ny3cqGStpfmyxnS', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 09:59:18.885293', '2026-02-18 09:59:18.885293', 31, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (41, 71, 'Nived', 'ashishvishnupriya7413@gmail.com', '$2b$10$oSEfgRjiH2LiGifj6jw0h.dXVicE7eZ.6zXnL1OO.0NDO/CpIH2oi', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 10:24:18.390514', '2026-02-18 10:24:18.390514', 32, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (52, 81, 'Tiya n', 'vishnupriya312@gmail.com', '$2b$10$l1lO7c/JYDvcI0Pp9TSDF.eaMlppw/qzmLz.bD6kF6XsHYVOOBX.G', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 15:36:08.291209', '2026-02-18 15:36:08.291209', 35, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (71, 85, 'Navaneetha Krishna', 'krish@nuroil.com', '$2b$10$pjZa2yQvVPEPEf/vY3mC2udwxM7dthboLTYWz0Nf8IcZhgD0hKY6m', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-28 11:37:54.130047', '2026-02-28 11:37:54.130047', 39, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (95, 103, 'Anna', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-04-12 12:19:23.094465', '2026-04-12 12:19:23.094465', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (83, 97, '5rrr', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-07 10:31:02.351876', '2026-04-07 10:31:02.351876', NULL, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (103, 108, 'Vishnu', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-17 11:56:45.682873', '2026-04-17 11:56:45.682873', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (63, 82, 'miya ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-02-20 10:37:02.15983', '2026-02-20 10:37:02.15983', 36, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (75, 89, 'Niva', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 15:56:01.261058', '2026-04-06 15:56:01.261058', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (77, 91, 'hhh', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 16:01:05.469235', '2026-04-06 16:01:05.469235', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (79, 93, 'ggg', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 17:04:14.239686', '2026-04-06 17:04:14.239686', NULL, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (82, 96, 't5', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 17:22:32.387118', '2026-04-06 17:22:32.387118', NULL, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (94, 102, 'Anna', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-04-12 12:19:00.350494', '2026-04-12 12:19:00.350494', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (70, 84, 'Maya', 'vishnupriya312@gmail.com', '$2b$10$OesoBHPYr8r7LhFGkUaT8OcalJquQc09FGXPtXNBcPnvtYT8L2bnC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-26 12:43:39.690581', '2026-02-26 12:43:39.690581', 38, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (27, 56, 'jj', 'yy', '$2b$10$Ik1nP41ArZ.rKugfUqjtHeSJP.p76.EpmCardy/FbjkfFc.fY9VIC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-14 09:42:09.627451', '2026-02-14 09:42:09.627451', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (55, 82, 'jj', 'yy', '$2b$10$733aX4C6vbmyxbHEFOsoZ.fpb8eYEfB/Kg4mazHSjCHQmyQYp/s7m', 'EMPLOYEE', 'ACTIVE', '2026-02-19 14:31:26.465013', '2026-02-19 14:31:26.465013', 36, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (54, 81, 'john ', 'john@gmail.com', '$2b$10$qIp1sAOPBBlfkgNgwoJ/8O3oWBHn5lmAFYky73uCAfpiAQfV.O1mK', 'EMPLOYEE', 'ACTIVE', '2026-02-19 11:56:12.687169', '2026-02-19 11:56:12.687169', 35, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (49, 77, 'Dora', 'vishnupriya312@gmail.com', '$2b$10$x8BVzWortqRG7KEiUNYuQeKxxrCdt4pmVQotwgsr0evQEQtZKql.u', 'EMPLOYEE', 'ACTIVE', '2026-02-18 14:41:22.092845', '2026-02-18 14:41:22.092845', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (50, 78, 'Meena', 'vishnupriya312@gmail.com', '$2b$10$x8BVzWortqRG7KEiUNYuQeKxxrCdt4pmVQotwgsr0evQEQtZKql.u', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 14:43:09.553775', '2026-02-18 14:43:09.553775', 34, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (30, 60, 'anaga', 'anaga@gmail.com', '$2b$10$I2xJbozpeZlJnT/sCI8M/.EZ1NcbljovHMpKj.B9whoXD5KYgkSUS', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-16 11:11:34.377288', '2026-02-16 11:11:34.377288', 21, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (51, 80, 'JJ', 'vishnupriya312@gmail.com', '$2b$10$x8BVzWortqRG7KEiUNYuQeKxxrCdt4pmVQotwgsr0evQEQtZKql.u', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 15:13:10.250835', '2026-02-18 15:13:10.250835', 34, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (12, 28, 'Ahaliya', 'ahaliya@12gmail.com', '$2b$10$WPLDybFiOs1BUhmRcu54SeMv4oGXeCWdGSgsPr8F1F.xXaAMrQTTK', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-06 12:14:30.089791', '2026-02-06 12:14:30.089791', 11, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (13, 29, 'Asin', 'asin@gmail.com', '$2b$10$V9W4tsrPIcJP58IOTZld1eshL7pvi5XNqlNbXO5v7g6u.6TjYOjoO', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-06 12:18:42.354488', '2026-02-06 12:18:42.354488', 12, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (31, 62, 'vishnu', 'vishnu@gmail.com', '$2b$10$eA1m05RpEuRAzLRDlaU8.OQJ28S.jdZQ/u1TF6yZlxrK4Wxae4jmK', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 14:19:45.577811', '2026-02-17 14:19:45.577811', 23, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (32, 63, 'James', 'james@gmail.com', '$2b$10$eztaAUtMf28mOrTX7vbgvOkJNymlt62BexazQz/EonipcyX/fOqsG', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 14:34:24.574477', '2026-02-17 14:34:24.574477', 24, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (14, 31, 'tesi', 'abin@123Gmail.com', '$2b$10$6fBuTb.TExRVLw7qspTLA.0unoxGW1x4e3LximyrC5Q9Wzq8Z/Pqy', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-06 12:30:48.910409', '2026-02-06 12:30:48.910409', 14, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (15, 32, 'Amaya', 'amaya@gmail.com', '$2b$10$6uOwKkJKMrXFeYeLpB1Fwe4HV4JbS.zgMwgfWeE3ZQjWFOydBt3iK', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-07 11:02:41.556222', '2026-02-07 11:02:41.556222', 15, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (53, 81, 'jo', 'vishnupriya312@gmail.com', '$2b$10$lR5YfFvQkBd7vNItuZThJ.eMQbTkMyg4A5sWvivrix/LZFP1Smr3q', 'EMPLOYEE', 'ACTIVE', '2026-02-18 15:37:31.808996', '2026-02-18 15:37:31.808996', 35, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (33, 64, 'alis', 'alis', '$2b$10$wl59qUr6tXCyJiEZC/UwzOUmuYqJ7kCMGsS0rjAAd5DEE8AC5dezK', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 14:41:57.583664', '2026-02-17 14:41:57.583664', 25, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (90, 101, 'Anna', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-04-11 17:27:36.422016', '2026-04-11 17:27:36.422016', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (78, 92, 'rtyt', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 16:09:23.639857', '2026-04-06 16:09:23.639857', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (72, 86, 'Keerthana ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-03-06 10:35:05.43792', '2026-03-06 10:35:05.43792', 40, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (69, 83, 'Sona', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-26 12:20:05.052418', '2026-02-26 12:20:05.052418', 37, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (81, 95, 'nirmal', 'nirmalrajs2023@gmail.com', '$2b$10$FE6feOgYFiudj5hQL/tSju8qGG.PnY1H69dCWfUTlFqe2hJBGaCoi', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 17:20:45.913791', '2026-04-06 17:20:45.913791', NULL, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (73, 87, 'Lakshmi', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 09:47:35.365554', '2026-04-06 09:47:35.365554', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (88, 102, 'Krish', 'krish@nuroil.com', '$2b$10$bzWpHtDjEoq1nJD0tDtqvOhHiT/KAjck7oJJbzKtVNkKeADLW1TOi', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-11 17:21:12.906146', '2026-04-11 17:21:12.906146', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (76, 90, 'rtre', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-06 15:57:48.605329', '2026-04-06 15:57:48.605329', 7, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (84, 98, 'mivru', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-07 10:33:14.116906', '2026-04-07 10:33:14.116906', NULL, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (43, 73, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 11:50:10.123444', '2026-02-18 11:50:10.123444', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (44, 74, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 12:01:30.51767', '2026-02-18 12:01:30.51767', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (45, 75, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 13:07:34.094703', '2026-02-18 13:07:34.094703', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (18, 36, 'amaya@gmail.com', 'amaya123', '$2b$10$a7p3KwjyS/TcrtEzHtU8euEqFeHBEcxP7CecnSsZg.iUoKhAQ9bxC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-09 14:54:18.374722', '2026-02-09 14:54:18.374722', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (74, 1, 'Superadmin', 'superadmin@trakio.com', '$2b$10$zjkQjJHMION/7UrY9fkBIuhEA/I0FFSTCo11SMgo7KesiIxE8WFbK', 'SUPER_ADMIN', 'ACTIVE', '2026-04-06 12:50:22.030583', '2026-04-06 12:50:22.030583', NULL, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (34, 65, 'miya', 'miya@gmail.com', '$2b$10$G./ukKv/B6gPIogMCMHpi.l/Sq0ECeW2v5Y4RLD4cruIuGhFeftyy', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-17 14:47:04.307607', '2026-02-17 14:47:04.307607', 26, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (19, 38, 'Meenu', 'meenu@gmail.com', '$2b$10$lDfIYFMNq0CxA8eL2jXcqu2w8L9Kh70KHE49th06mSzBThPzNalWm', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-12 12:20:20.130573', '2026-02-12 12:20:20.130573', 19, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (21, 41, 'ii', 'ii', '$2b$10$dc2sPg.tObEmLN35Qrl7w.rbodcH062BUs1dqw2o5qPcLgwH4MPsW', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-13 15:23:54.939455', '2026-02-13 15:23:54.939455', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (23, 44, 'mynthra', 'mynthra@gmail.com', '$2b$10$Ez91NOSJ2/tDc9wOiwp0w.V9Z1g20amkMJclVJDcu.zMwKeUvwImi', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-13 16:42:50.356299', '2026-02-13 16:42:50.356299', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (24, 45, 'shain', 'shain@gmail.com', '$2b$10$IKes5Y91InMP38TxvERVxu3jVZOuEPqqwLkTP8b9VDByhpdrZW1O6', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-13 16:55:14.229785', '2026-02-13 16:55:14.229785', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (25, 54, 'ttt', 'tt', '$2b$10$/MMThViXIIzrkB/OJCc.z.SNNGfqFyyX1v5HvSB9QS3CHEU1mm8OC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-13 17:25:54.024633', '2026-02-13 17:25:54.024633', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (26, 55, 'uuu', 'u', '$2b$10$gndpvTLi7/xaI2fIZBHsGOaYQ.6B9Q9HUNbOVYGSHsBx9Obo73qLy', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-14 09:16:09.557305', '2026-02-14 09:16:09.557305', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (28, 58, 'ii', 'iii', '$2b$10$f56kSufX.dUp7nCPPwmpFuzvinNscTHkvAxZCZcTW3gOhBp//3iQC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-14 09:48:20.494357', '2026-02-14 09:48:20.494357', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (29, 59, 'ami@gmail.com', 'ami123', '$2b$10$oVSOt.FRWVcr5QjtlWi4buO7ajD/ufzC/aswiVMX4c3b4fqN/Knw6', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-16 10:53:16.582259', '2026-02-16 10:53:16.582259', 18, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (89, 103, 'Krish', 'krish@nuroil.com', '$2b$10$Ie2IsTKmx7AcCKy/5lL5wuUfJHdUxZsZYAH6p7HIjxxl/PxUQWAP2', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-11 17:23:42.393732', '2026-04-11 17:23:42.393732', 41, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (102, 100, 'krish', 'krish@nuroil.com', '$2b$10$eCtqlHeq0glnGhrV.lzKMeHYVdzPelzoSkf9W6J2UAtYvZJgHZ/Qq', 'COMPANY_ADMIN', 'ACTIVE', '2026-04-16 17:54:02.702514', '2026-04-16 17:54:02.702514', 41, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (46, 74, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-02-18 14:17:39.741104', '2026-02-18 14:17:39.741104', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (47, 76, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 14:27:58.215906', '2026-02-18 14:27:58.215906', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (42, 72, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'COMPANY_ADMIN', 'ACTIVE', '2026-02-18 11:23:36.846207', '2026-02-18 11:23:36.846207', 33, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (56, 82, 'Rudran ', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-02-19 14:43:23.905942', '2026-02-19 14:43:23.905942', 36, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.users VALUES (62, 69, 'jojj', 'vishnupriyaashish9624@gmail.com', '$2b$10$d.WuLhVyt0/Da5fxYGcrH.nzkD1Vcfkc4r/F6QXHQ9Ykxdvf5u7EC', 'EMPLOYEE', 'ACTIVE', '2026-02-20 10:31:05.939972', '2026-02-20 10:31:05.939972', 30, false, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5551 (class 0 OID 24632)
-- Dependencies: 289
-- Data for Name: vehicle_module_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.vehicle_module_details VALUES (2672, 156, 12, 'company_name', 'Global Logistics Hub (HQ)', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2673, 156, 12, 'country_name', 'UAE', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2674, 156, 12, 'premises_type_name', 'All', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2675, 156, 12, 'sec145_plate_no', 'ddd', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2676, 156, 12, 'sec125_plate_no', 'ddd', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2677, 156, 12, 'sec135_plate_no', 'ddd', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2678, 156, 12, 'sec137_plate_no', 'ddd', '2026-04-28 11:32:00.486914') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2679, 157, 12, 'company_name', 'Global Logistics Hub (HQ)', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2680, 157, 12, 'country_name', 'UAE', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2681, 157, 12, 'premises_type_name', 'All', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2702, 157, 12, 'vehicle_name_', 'Toyota', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2703, 157, 12, 'v_id_code', '157', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2704, 157, 12, 'country', 'UAE', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2705, 157, 12, 'area', '-', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2706, 157, 12, 'vehicle_usage_name', 'All', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2682, 157, 12, 'sec144_company_', 'Global Logistics Hub (HQ)', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2683, 157, 12, 'sec144_vehicle_name_', 'Toyota', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2684, 157, 12, 'sec144_traffic_file_number', '787', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2685, 157, 12, 'sec144_make', '878787', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2686, 157, 12, 'sec144_model', '8787', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2687, 157, 12, 'sec144_year', '7887', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2688, 157, 12, 'sec144_color', 'blue', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2689, 157, 12, 'sec144_seating_capacity_', '5', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2690, 157, 12, 'sec144_chassis_no___vin_', '555', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2691, 157, 12, 'sec144_engine_no_', '55', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2692, 157, 12, 'sec144_fuel_type', 'petrol_', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2693, 157, 12, 'sec144_fuel_type_label', 'Petrol ', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2694, 157, 12, 'sec144_current_mileage__km_', '55', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2695, 157, 12, 'sec144_status', 'active_', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2696, 157, 12, 'sec144_status_label', 'Active ', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2697, 157, 12, 'sec144_notes', 'rtd ', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2698, 157, 12, 'chassis_no', '555', '2026-04-28 15:23:10.679087') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2724, 157, 12, 'sec144_vehicle_type', 'Toyota (-)', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2725, 157, 12, 'sec144_vehicle_type_label', 'Toyota (-)', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2726, 157, 12, 'sec144_plate_number_', '455665', '2026-04-28 15:26:33.235826') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2727, 158, 12, 'company_name', 'Global Logistics Hub (HQ)', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2728, 158, 12, 'country_name', 'UAE', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2729, 158, 12, 'premises_type_name', 'All', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2730, 158, 12, 'sec144_vehicle_id', 'VH-2026-29-04-001', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2731, 158, 12, 'sec144_company_', 'Global Logistics Hub (HQ)', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2732, 158, 12, 'sec144_traffic_file_number', 'dd', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2733, 158, 12, 'sec144_plate_number_', 'dd', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2734, 158, 12, 'sec144_vehicle_type', 'Toyota (455665)', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2735, 158, 12, 'sec144_vehicle_type_label', 'Toyota (455665)', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2736, 158, 12, 'sec144_make', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2737, 158, 12, 'sec144_model', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2738, 158, 12, 'sec144_year', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2739, 158, 12, 'sec144_color', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2740, 158, 12, 'sec144_seating_capacity_', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2741, 158, 12, 'sec144_chassis_no___vin_', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2742, 158, 12, 'sec144_engine_no_', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2660, 154, 12, 'company_name', 'Global Logistics Hub (HQ)', '2026-04-28 11:20:26.021571') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2661, 154, 12, 'country_name', 'UAE', '2026-04-28 11:20:26.021571') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2662, 154, 12, 'premises_type_name', 'All', '2026-04-28 11:20:26.021571') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2663, 154, 12, 'sec144_company_', 'Global Logistics Hub (HQ)', '2026-04-28 11:20:26.021571') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2664, 154, 12, 'sec144_vehicle_name_', 'rrrrr', '2026-04-28 11:20:26.021571') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2743, 158, 12, 'sec144_fuel_type', 'cng', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2744, 158, 12, 'sec144_fuel_type_label', 'CNG', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2745, 158, 12, 'sec144_current_mileage__km_', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2746, 158, 12, 'sec144_status', 'active_', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2747, 158, 12, 'sec144_status_label', 'Active ', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2748, 158, 12, 'sec144_notes', 'ffd', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_module_details VALUES (2749, 158, 12, 'chassis_no', 'ff', '2026-04-29 10:59:04.45619') ON CONFLICT DO NOTHING;


--
-- TOC entry 5559 (class 0 OID 40965)
-- Dependencies: 297
-- Data for Name: vehicle_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.vehicle_usage VALUES (1, 'Commercial') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_usage VALUES (2, 'Personal') ON CONFLICT DO NOTHING;
INSERT INTO public.vehicle_usage VALUES (3, 'All') ON CONFLICT DO NOTHING;


--
-- TOC entry 5549 (class 0 OID 24617)
-- Dependencies: 287
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.vehicles VALUES (154, 12, 'rrrrr', NULL, NULL, NULL, '', 'Active', 1, NULL, NULL, NULL, NULL, '2026-04-28 11:20:26.021571', '2026-04-28 11:20:26.021571', 'All', 3) ON CONFLICT DO NOTHING;
INSERT INTO public.vehicles VALUES (156, 12, 'Vehicle-520487', 'ddd', NULL, NULL, '', 'Active', 1, NULL, NULL, NULL, NULL, '2026-04-28 11:32:00.486914', '2026-04-28 11:32:00.486914', 'All', 3) ON CONFLICT DO NOTHING;
INSERT INTO public.vehicles VALUES (157, 12, 'Toyota', NULL, NULL, NULL, '', 'Active', 1, NULL, NULL, NULL, NULL, '2026-04-28 15:23:10.679087', '2026-04-28 15:26:33.235826', 'All', 3) ON CONFLICT DO NOTHING;
INSERT INTO public.vehicles VALUES (158, 12, 'Vehicle-944456', 'dd', NULL, NULL, '', 'Active', 1, NULL, NULL, NULL, NULL, '2026-04-29 10:59:04.45619', '2026-04-29 10:59:04.45619', 'All', 3) ON CONFLICT DO NOTHING;


--
-- TOC entry 5612 (class 0 OID 0)
-- Dependencies: 219
-- Name: area_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.area_id_seq', 3, true);


--
-- TOC entry 5613 (class 0 OID 0)
-- Dependencies: 221
-- Name: asset_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_assignments_id_seq', 2, true);


--
-- TOC entry 5614 (class 0 OID 0)
-- Dependencies: 223
-- Name: asset_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_categories_id_seq', 17, true);


--
-- TOC entry 5615 (class 0 OID 0)
-- Dependencies: 225
-- Name: asset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asset_requests_id_seq', 1, true);


--
-- TOC entry 5616 (class 0 OID 0)
-- Dependencies: 227
-- Name: assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assets_id_seq', 9, true);


--
-- TOC entry 5617 (class 0 OID 0)
-- Dependencies: 229
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, true);


--
-- TOC entry 5618 (class 0 OID 0)
-- Dependencies: 282
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 41, true);


--
-- TOC entry 5619 (class 0 OID 0)
-- Dependencies: 231
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 109, true);


--
-- TOC entry 5620 (class 0 OID 0)
-- Dependencies: 284
-- Name: company_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_documents_id_seq', 3, true);


--
-- TOC entry 5621 (class 0 OID 0)
-- Dependencies: 233
-- Name: company_module_field_selection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_module_field_selection_id_seq', 3320, true);


--
-- TOC entry 5622 (class 0 OID 0)
-- Dependencies: 235
-- Name: company_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_modules_id_seq', 132, true);


--
-- TOC entry 5623 (class 0 OID 0)
-- Dependencies: 237
-- Name: countries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.countries_id_seq', 3, true);


--
-- TOC entry 5624 (class 0 OID 0)
-- Dependencies: 239
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 3, true);


--
-- TOC entry 5625 (class 0 OID 0)
-- Dependencies: 241
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 67, true);


--
-- TOC entry 5626 (class 0 OID 0)
-- Dependencies: 243
-- Name: maintenance_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_tickets_id_seq', 1, true);


--
-- TOC entry 5627 (class 0 OID 0)
-- Dependencies: 245
-- Name: module_heads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_heads_id_seq', 1, true);


--
-- TOC entry 5628 (class 0 OID 0)
-- Dependencies: 247
-- Name: module_master_module_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_master_module_id_seq', 16, true);


--
-- TOC entry 5629 (class 0 OID 0)
-- Dependencies: 249
-- Name: module_section_field_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_section_field_options_id_seq', 353, true);


--
-- TOC entry 5630 (class 0 OID 0)
-- Dependencies: 251
-- Name: module_section_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_section_fields_id_seq', 830, true);


--
-- TOC entry 5631 (class 0 OID 0)
-- Dependencies: 253
-- Name: module_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_sections_id_seq', 146, true);


--
-- TOC entry 5632 (class 0 OID 0)
-- Dependencies: 255
-- Name: module_subhead_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_subhead_options_id_seq', 1, true);


--
-- TOC entry 5633 (class 0 OID 0)
-- Dependencies: 257
-- Name: module_subheads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_subheads_id_seq', 1, true);


--
-- TOC entry 5634 (class 0 OID 0)
-- Dependencies: 259
-- Name: module_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_templates_id_seq', 1, true);


--
-- TOC entry 5635 (class 0 OID 0)
-- Dependencies: 261
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modules_id_seq', 5, true);


--
-- TOC entry 5636 (class 0 OID 0)
-- Dependencies: 263
-- Name: modules_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modules_master_id_seq', 9, true);


--
-- TOC entry 5637 (class 0 OID 0)
-- Dependencies: 266
-- Name: office_premise_attachments_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.office_premise_attachments_attachment_id_seq', 1, true);


--
-- TOC entry 5638 (class 0 OID 0)
-- Dependencies: 270
-- Name: office_premises_documents_doc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.office_premises_documents_doc_id_seq', 2, true);


--
-- TOC entry 5639 (class 0 OID 0)
-- Dependencies: 268
-- Name: office_premises_premise_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.office_premises_premise_id_seq', 99, true);


--
-- TOC entry 5640 (class 0 OID 0)
-- Dependencies: 274
-- Name: premises_module_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.premises_module_details_id_seq', 680, true);


--
-- TOC entry 5641 (class 0 OID 0)
-- Dependencies: 276
-- Name: premises_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.premises_types_id_seq', 3, true);


--
-- TOC entry 5642 (class 0 OID 0)
-- Dependencies: 278
-- Name: property_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_types_id_seq', 9, true);


--
-- TOC entry 5643 (class 0 OID 0)
-- Dependencies: 300
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regions_id_seq', 14, true);


--
-- TOC entry 5644 (class 0 OID 0)
-- Dependencies: 294
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 56, true);


--
-- TOC entry 5645 (class 0 OID 0)
-- Dependencies: 292
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- TOC entry 5646 (class 0 OID 0)
-- Dependencies: 290
-- Name: smtp_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.smtp_configs_id_seq', 3, true);


--
-- TOC entry 5647 (class 0 OID 0)
-- Dependencies: 298
-- Name: status_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.status_master_id_seq', 3, true);


--
-- TOC entry 5648 (class 0 OID 0)
-- Dependencies: 280
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 104, true);


--
-- TOC entry 5649 (class 0 OID 0)
-- Dependencies: 288
-- Name: vehicle_module_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vehicle_module_details_id_seq', 2749, true);


--
-- TOC entry 5650 (class 0 OID 0)
-- Dependencies: 296
-- Name: vehicle_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vehicle_usage_id_seq', 8, true);


--
-- TOC entry 5651 (class 0 OID 0)
-- Dependencies: 286
-- Name: vehicles_vehicle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vehicles_vehicle_id_seq', 158, true);


--
-- TOC entry 5162 (class 2606 OID 20252)
-- Name: area area_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.area
    ADD CONSTRAINT area_pkey PRIMARY KEY (id);


--
-- TOC entry 5164 (class 2606 OID 20267)
-- Name: asset_assignments asset_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5168 (class 2606 OID 20279)
-- Name: asset_categories asset_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5172 (class 2606 OID 20296)
-- Name: asset_requests asset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_requests
    ADD CONSTRAINT asset_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5174 (class 2606 OID 20312)
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- TOC entry 5180 (class 2606 OID 20325)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5258 (class 2606 OID 22890)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 5183 (class 2606 OID 20341)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5260 (class 2606 OID 22915)
-- Name: company_documents company_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5186 (class 2606 OID 20353)
-- Name: company_module_field_selection company_module_field_selection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_module_field_selection
    ADD CONSTRAINT company_module_field_selection_pkey PRIMARY KEY (id);


--
-- TOC entry 5190 (class 2606 OID 20367)
-- Name: company_modules company_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_pkey PRIMARY KEY (id);


--
-- TOC entry 5199 (class 2606 OID 20376)
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- TOC entry 5202 (class 2606 OID 20386)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5205 (class 2606 OID 20398)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 5207 (class 2606 OID 20416)
-- Name: maintenance_tickets maintenance_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5209 (class 2606 OID 20431)
-- Name: module_heads module_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_heads
    ADD CONSTRAINT module_heads_pkey PRIMARY KEY (id);


--
-- TOC entry 5212 (class 2606 OID 20443)
-- Name: module_master module_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_master
    ADD CONSTRAINT module_master_pkey PRIMARY KEY (module_id);


--
-- TOC entry 5215 (class 2606 OID 20459)
-- Name: module_section_field_options module_section_field_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_field_options
    ADD CONSTRAINT module_section_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5217 (class 2606 OID 20482)
-- Name: module_section_fields module_section_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_fields
    ADD CONSTRAINT module_section_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5221 (class 2606 OID 20498)
-- Name: module_sections module_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_sections
    ADD CONSTRAINT module_sections_pkey PRIMARY KEY (id);


--
-- TOC entry 5223 (class 2606 OID 20516)
-- Name: module_subhead_options module_subhead_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_subhead_options
    ADD CONSTRAINT module_subhead_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5227 (class 2606 OID 20535)
-- Name: module_subheads module_subheads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_subheads
    ADD CONSTRAINT module_subheads_pkey PRIMARY KEY (id);


--
-- TOC entry 5229 (class 2606 OID 20552)
-- Name: module_templates module_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_templates
    ADD CONSTRAINT module_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5234 (class 2606 OID 20581)
-- Name: modules_master modules_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules_master
    ADD CONSTRAINT modules_master_pkey PRIMARY KEY (id);


--
-- TOC entry 5231 (class 2606 OID 20569)
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- TOC entry 5236 (class 2606 OID 20598)
-- Name: office_owned_details office_owned_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_owned_details
    ADD CONSTRAINT office_owned_details_pkey PRIMARY KEY (premise_id);


--
-- TOC entry 5238 (class 2606 OID 20614)
-- Name: office_premise_attachments office_premise_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premise_attachments
    ADD CONSTRAINT office_premise_attachments_pkey PRIMARY KEY (attachment_id);


--
-- TOC entry 5243 (class 2606 OID 20656)
-- Name: office_premises_documents office_premises_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premises_documents
    ADD CONSTRAINT office_premises_documents_pkey PRIMARY KEY (doc_id);


--
-- TOC entry 5241 (class 2606 OID 20639)
-- Name: office_premises office_premises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premises
    ADD CONSTRAINT office_premises_pkey PRIMARY KEY (premise_id);


--
-- TOC entry 5245 (class 2606 OID 20665)
-- Name: office_premises_utilities office_premises_utilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premises_utilities
    ADD CONSTRAINT office_premises_utilities_pkey PRIMARY KEY (premise_id);


--
-- TOC entry 5247 (class 2606 OID 20680)
-- Name: office_rental_details office_rental_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_rental_details
    ADD CONSTRAINT office_rental_details_pkey PRIMARY KEY (premise_id);


--
-- TOC entry 5249 (class 2606 OID 20697)
-- Name: premises_module_details premises_module_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premises_module_details
    ADD CONSTRAINT premises_module_details_pkey PRIMARY KEY (id);


--
-- TOC entry 5251 (class 2606 OID 20706)
-- Name: premises_types premises_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premises_types
    ADD CONSTRAINT premises_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5254 (class 2606 OID 20715)
-- Name: property_types property_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_types
    ADD CONSTRAINT property_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5284 (class 2606 OID 74652)
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- TOC entry 5274 (class 2606 OID 32829)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5276 (class 2606 OID 32831)
-- Name: role_permissions role_permissions_role_id_module_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_module_name_key UNIQUE (role_id, module_name);


--
-- TOC entry 5270 (class 2606 OID 32811)
-- Name: roles roles_company_id_role_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_company_id_role_name_key UNIQUE (company_id, role_name);


--
-- TOC entry 5272 (class 2606 OID 32809)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5268 (class 2606 OID 32793)
-- Name: smtp_configs smtp_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_configs
    ADD CONSTRAINT smtp_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5282 (class 2606 OID 40995)
-- Name: status_master status_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_master
    ADD CONSTRAINT status_master_pkey PRIMARY KEY (id);


--
-- TOC entry 5170 (class 2606 OID 49986)
-- Name: asset_categories unique_category_name_per_company; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT unique_category_name_per_company UNIQUE (company_id, name);


--
-- TOC entry 5256 (class 2606 OID 20734)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5264 (class 2606 OID 24644)
-- Name: vehicle_module_details vehicle_module_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_module_details
    ADD CONSTRAINT vehicle_module_details_pkey PRIMARY KEY (id);


--
-- TOC entry 5266 (class 2606 OID 24646)
-- Name: vehicle_module_details vehicle_module_details_vehicle_id_field_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_module_details
    ADD CONSTRAINT vehicle_module_details_vehicle_id_field_key_key UNIQUE (vehicle_id, field_key);


--
-- TOC entry 5278 (class 2606 OID 40984)
-- Name: vehicle_usage vehicle_usage_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_usage
    ADD CONSTRAINT vehicle_usage_name_unique UNIQUE (name);


--
-- TOC entry 5280 (class 2606 OID 40972)
-- Name: vehicle_usage vehicle_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_usage
    ADD CONSTRAINT vehicle_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5262 (class 2606 OID 24630)
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (vehicle_id);


--
-- TOC entry 5165 (class 1259 OID 20739)
-- Name: asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asset_id ON public.asset_assignments USING btree (asset_id);


--
-- TOC entry 5175 (class 1259 OID 20736)
-- Name: category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX category_id ON public.assets USING btree (category_id);


--
-- TOC entry 5176 (class 1259 OID 20735)
-- Name: company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX company_id ON public.assets USING btree (company_id, asset_code);


--
-- TOC entry 5177 (class 1259 OID 20738)
-- Name: company_id_2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_id_2 ON public.assets USING btree (company_id);


--
-- TOC entry 5178 (class 1259 OID 20737)
-- Name: current_holder_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX current_holder_id ON public.assets USING btree (current_holder_id);


--
-- TOC entry 5203 (class 1259 OID 20753)
-- Name: department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX department_id ON public.employees USING btree (department_id);


--
-- TOC entry 5166 (class 1259 OID 20740)
-- Name: employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX employee_id ON public.asset_assignments USING btree (employee_id);


--
-- TOC entry 5213 (class 1259 OID 20758)
-- Name: field_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX field_id ON public.module_section_field_options USING btree (field_id);


--
-- TOC entry 5191 (class 1259 OID 20749)
-- Name: fk_cm_property_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fk_cm_property_type ON public.company_modules USING btree (property_type_id);


--
-- TOC entry 5225 (class 1259 OID 20759)
-- Name: head_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX head_id ON public.module_subheads USING btree (head_id);


--
-- TOC entry 5192 (class 1259 OID 20746)
-- Name: idx_area_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_area_id ON public.company_modules USING btree (area_id);


--
-- TOC entry 5187 (class 1259 OID 20750)
-- Name: idx_cm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cm ON public.company_module_field_selection USING btree (company_module_id);


--
-- TOC entry 5193 (class 1259 OID 20748)
-- Name: idx_company_module_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_module_search ON public.company_modules USING btree (company_id, module_id);


--
-- TOC entry 5194 (class 1259 OID 20744)
-- Name: idx_country_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_id ON public.company_modules USING btree (country_id);


--
-- TOC entry 5188 (class 1259 OID 20751)
-- Name: idx_field; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_field ON public.company_module_field_selection USING btree (field_id);


--
-- TOC entry 5195 (class 1259 OID 20745)
-- Name: idx_premises_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_premises_type_id ON public.company_modules USING btree (premises_type_id);


--
-- TOC entry 5196 (class 1259 OID 20747)
-- Name: idx_status_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status_id ON public.company_modules USING btree (status_id);


--
-- TOC entry 5197 (class 1259 OID 20743)
-- Name: module_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX module_id ON public.company_modules USING btree (module_id);


--
-- TOC entry 5232 (class 1259 OID 20754)
-- Name: module_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX module_key ON public.modules_master USING btree (module_key);


--
-- TOC entry 5252 (class 1259 OID 20762)
-- Name: name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX name ON public.property_types USING btree (name);


--
-- TOC entry 5239 (class 1259 OID 20761)
-- Name: premise_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX premise_id ON public.office_premise_attachments USING btree (premise_id);


--
-- TOC entry 5218 (class 1259 OID 20757)
-- Name: section_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX section_id ON public.module_section_fields USING btree (section_id);


--
-- TOC entry 5184 (class 1259 OID 20742)
-- Name: subdomain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX subdomain ON public.companies USING btree (subdomain);


--
-- TOC entry 5224 (class 1259 OID 20760)
-- Name: subhead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subhead_id ON public.module_subhead_options USING btree (subhead_id);


--
-- TOC entry 5210 (class 1259 OID 20755)
-- Name: template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX template_id ON public.module_heads USING btree (template_id);


--
-- TOC entry 5219 (class 1259 OID 20756)
-- Name: unique_field_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_field_key ON public.module_section_fields USING btree (company_id, section_id, field_key);


--
-- TOC entry 5200 (class 1259 OID 20752)
-- Name: uq_country_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_country_name ON public.countries USING btree (country_name);


--
-- TOC entry 5181 (class 1259 OID 20741)
-- Name: user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_id ON public.audit_logs USING btree (user_id);


--
-- TOC entry 5333 (class 2620 OID 22896)
-- Name: clients update_clients_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5285 (class 2606 OID 20778)
-- Name: asset_assignments asset_assignments_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5286 (class 2606 OID 20783)
-- Name: asset_assignments asset_assignments_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_ibfk_2 FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- TOC entry 5287 (class 2606 OID 20788)
-- Name: asset_assignments asset_assignments_ibfk_3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_ibfk_3 FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- TOC entry 5288 (class 2606 OID 20793)
-- Name: asset_categories asset_categories_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5289 (class 2606 OID 49957)
-- Name: asset_categories asset_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.asset_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5290 (class 2606 OID 20798)
-- Name: asset_requests asset_requests_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_requests
    ADD CONSTRAINT asset_requests_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5291 (class 2606 OID 20803)
-- Name: asset_requests asset_requests_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_requests
    ADD CONSTRAINT asset_requests_ibfk_2 FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- TOC entry 5292 (class 2606 OID 20763)
-- Name: assets assets_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5293 (class 2606 OID 20768)
-- Name: assets assets_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_ibfk_2 FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE CASCADE;


--
-- TOC entry 5294 (class 2606 OID 20773)
-- Name: assets assets_ibfk_3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_ibfk_3 FOREIGN KEY (current_holder_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- TOC entry 5295 (class 2606 OID 20808)
-- Name: audit_logs audit_logs_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5296 (class 2606 OID 20813)
-- Name: audit_logs audit_logs_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_ibfk_2 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5299 (class 2606 OID 20818)
-- Name: company_modules company_modules_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5300 (class 2606 OID 82869)
-- Name: company_modules company_modules_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.module_master(module_id);


--
-- TOC entry 5301 (class 2606 OID 49988)
-- Name: company_modules company_modules_vehicle_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_vehicle_category_id_fkey FOREIGN KEY (vehicle_category_id) REFERENCES public.module_section_field_options(id);


--
-- TOC entry 5302 (class 2606 OID 40978)
-- Name: company_modules company_modules_vehicle_usage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_vehicle_usage_id_fkey FOREIGN KEY (vehicle_usage_id) REFERENCES public.vehicle_usage(id);


--
-- TOC entry 5304 (class 2606 OID 20838)
-- Name: departments departments_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5305 (class 2606 OID 20843)
-- Name: employees employees_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5306 (class 2606 OID 20848)
-- Name: employees employees_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_ibfk_2 FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- TOC entry 5303 (class 2606 OID 20828)
-- Name: company_modules fk_cm_property_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT fk_cm_property_type FOREIGN KEY (property_type_id) REFERENCES public.property_types(id) ON DELETE CASCADE;


--
-- TOC entry 5298 (class 2606 OID 20833)
-- Name: company_module_field_selection fk_cm_sel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_module_field_selection
    ADD CONSTRAINT fk_cm_sel FOREIGN KEY (company_module_id) REFERENCES public.company_modules(id) ON DELETE CASCADE;


--
-- TOC entry 5297 (class 2606 OID 22891)
-- Name: companies fk_company_client; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_company_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- TOC entry 5307 (class 2606 OID 20853)
-- Name: maintenance_tickets maintenance_tickets_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5308 (class 2606 OID 20858)
-- Name: maintenance_tickets maintenance_tickets_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_ibfk_2 FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- TOC entry 5309 (class 2606 OID 20868)
-- Name: module_heads module_heads_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_heads
    ADD CONSTRAINT module_heads_ibfk_1 FOREIGN KEY (template_id) REFERENCES public.module_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5310 (class 2606 OID 82864)
-- Name: module_master module_master_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_master
    ADD CONSTRAINT module_master_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.module_master(module_id);


--
-- TOC entry 5311 (class 2606 OID 20898)
-- Name: module_section_field_options module_section_field_options_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_field_options
    ADD CONSTRAINT module_section_field_options_ibfk_1 FOREIGN KEY (field_id) REFERENCES public.module_section_fields(id) ON DELETE CASCADE;


--
-- TOC entry 5312 (class 2606 OID 20883)
-- Name: module_section_fields module_section_fields_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_fields
    ADD CONSTRAINT module_section_fields_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5313 (class 2606 OID 20888)
-- Name: module_section_fields module_section_fields_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_fields
    ADD CONSTRAINT module_section_fields_ibfk_2 FOREIGN KEY (module_id) REFERENCES public.module_master(module_id) ON DELETE CASCADE;


--
-- TOC entry 5314 (class 2606 OID 20893)
-- Name: module_section_fields module_section_fields_ibfk_3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_section_fields
    ADD CONSTRAINT module_section_fields_ibfk_3 FOREIGN KEY (section_id) REFERENCES public.module_sections(id) ON DELETE CASCADE;


--
-- TOC entry 5315 (class 2606 OID 20873)
-- Name: module_sections module_sections_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_sections
    ADD CONSTRAINT module_sections_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5316 (class 2606 OID 20878)
-- Name: module_sections module_sections_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_sections
    ADD CONSTRAINT module_sections_ibfk_2 FOREIGN KEY (module_id) REFERENCES public.module_master(module_id) ON DELETE CASCADE;


--
-- TOC entry 5317 (class 2606 OID 20908)
-- Name: module_subhead_options module_subhead_options_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_subhead_options
    ADD CONSTRAINT module_subhead_options_ibfk_1 FOREIGN KEY (subhead_id) REFERENCES public.module_subheads(id) ON DELETE CASCADE;


--
-- TOC entry 5318 (class 2606 OID 20903)
-- Name: module_subheads module_subheads_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_subheads
    ADD CONSTRAINT module_subheads_ibfk_1 FOREIGN KEY (head_id) REFERENCES public.module_heads(id) ON DELETE CASCADE;


--
-- TOC entry 5319 (class 2606 OID 20913)
-- Name: module_templates module_templates_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_templates
    ADD CONSTRAINT module_templates_ibfk_1 FOREIGN KEY (module_id) REFERENCES public.module_master(module_id) ON DELETE CASCADE;


--
-- TOC entry 5320 (class 2606 OID 20863)
-- Name: modules modules_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5321 (class 2606 OID 20918)
-- Name: office_owned_details office_owned_details_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_owned_details
    ADD CONSTRAINT office_owned_details_ibfk_1 FOREIGN KEY (premise_id) REFERENCES public.office_premises(premise_id) ON DELETE CASCADE;


--
-- TOC entry 5322 (class 2606 OID 20928)
-- Name: office_premise_attachments office_premise_attachments_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premise_attachments
    ADD CONSTRAINT office_premise_attachments_ibfk_1 FOREIGN KEY (premise_id) REFERENCES public.office_premises(premise_id) ON DELETE CASCADE;


--
-- TOC entry 5323 (class 2606 OID 20933)
-- Name: office_premise_attachments office_premise_attachments_ibfk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premise_attachments
    ADD CONSTRAINT office_premise_attachments_ibfk_2 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5324 (class 2606 OID 20923)
-- Name: office_premises office_premises_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_premises
    ADD CONSTRAINT office_premises_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5325 (class 2606 OID 20938)
-- Name: office_rental_details office_rental_details_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_rental_details
    ADD CONSTRAINT office_rental_details_ibfk_1 FOREIGN KEY (premise_id) REFERENCES public.office_premises(premise_id) ON DELETE CASCADE;


--
-- TOC entry 5332 (class 2606 OID 32832)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5331 (class 2606 OID 32812)
-- Name: roles roles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5330 (class 2606 OID 40998)
-- Name: smtp_configs smtp_configs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_configs
    ADD CONSTRAINT smtp_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5326 (class 2606 OID 20943)
-- Name: users users_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_ibfk_1 FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5327 (class 2606 OID 32837)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- TOC entry 5329 (class 2606 OID 24647)
-- Name: vehicle_module_details vehicle_module_details_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_module_details
    ADD CONSTRAINT vehicle_module_details_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE;


--
-- TOC entry 5328 (class 2606 OID 40973)
-- Name: vehicles vehicles_vehicle_usage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vehicle_usage_id_fkey FOREIGN KEY (vehicle_usage_id) REFERENCES public.vehicle_usage(id);


--
-- TOC entry 5571 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2026-05-01 15:01:04

--
-- PostgreSQL database dump complete
--

\unrestrict fAWa6F8Cbqb1iIGb6Qh62c1o326Wr1L0k0d3Dgu75cIamGeurO5EaqzcjZk6Ijf

