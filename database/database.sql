--
-- PostgreSQL database dump
--

\restrict nDHIk2rwOFb6ffb7Cp7Mi6xpTo8F0MGqfDZC8s97QCByR3gXhvkaJuwDesqLTJ9

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

-- Started on 2026-06-06 13:27:32 +07

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 216 (class 1259 OID 16415)
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(100),
    email character varying(150)
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16414)
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- TOC entry 3452 (class 0 OID 0)
-- Dependencies: 215
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- TOC entry 218 (class 1259 OID 16462)
-- Name: members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.members (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    father_id integer,
    mother_id integer,
    date_birth integer,
    date_death integer
);


ALTER TABLE public.members OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16461)
-- Name: members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.members_id_seq OWNER TO postgres;

--
-- TOC entry 3453 (class 0 OID 0)
-- Dependencies: 217
-- Name: members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;


--
-- TOC entry 3288 (class 2604 OID 16418)
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- TOC entry 3289 (class 2604 OID 16465)
-- Name: members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);


--
-- TOC entry 3444 (class 0 OID 16415)
-- Dependencies: 216
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, username, password, name, email) FROM stdin;
1	horizon	$2b$10$LC27fztu9oyO2Kjg5nix5efnVCBlV/Q5A0LJHRZC.dOzRRUWzk6Zu	giang	giang0072k6@gmail.com
2	ghorizon	$2b$10$arLQuCZqW9ek7PIFjr5l9uI.YcltOr5SVpLKq6ItWnV0vcgYo6nc6	dung	horizonmusic2k@gmail.com
3	tt1	$2b$10$WVnSVfcOJ2h5qUmIsETjZOjyc9OtyOxbaem49RJ8RBGTmCHbGChWW	thanh	thanh@gmail.com
4	huydepzai	$2b$10$IIx5snXPKTm0Y5ShA4l2d.fChqbAvZYfKNFwjbAxQHwKbRKhYTm8C	huy	huy1999@gmail.com
\.


--
-- TOC entry 3446 (class 0 OID 16462)
-- Dependencies: 218
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.members (id, name, father_id, mother_id, date_birth, date_death) FROM stdin;
1	Nguyễn Văn A	\N	\N	1930	2010
2	Bà Trần Thị B	\N	\N	1935	2012
3	Nguyễn Văn C	1	2	1958	\N
4	Nguyễn Thị D	1	2	1960	\N
5	Nguyễn Văn E	1	2	1962	\N
6	Nguyễn Thị F	1	2	1965	\N
7	Nguyễn Văn G	3	\N	1985	\N
8	Nguyễn Thị H	3	\N	1987	\N
9	Nguyễn Văn I	4	\N	1990	\N
\.


--
-- TOC entry 3454 (class 0 OID 0)
-- Dependencies: 215
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 4, true);


--
-- TOC entry 3455 (class 0 OID 0)
-- Dependencies: 217
-- Name: members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.members_id_seq', 1, false);


--
-- TOC entry 3291 (class 2606 OID 16424)
-- Name: accounts accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);


--
-- TOC entry 3293 (class 2606 OID 16420)
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 3295 (class 2606 OID 16422)
-- Name: accounts accounts_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_username_key UNIQUE (username);


--
-- TOC entry 3297 (class 2606 OID 16467)
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- TOC entry 3298 (class 2606 OID 16468)
-- Name: members members_father_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_father_id_fkey FOREIGN KEY (father_id) REFERENCES public.members(id);


--
-- TOC entry 3299 (class 2606 OID 16473)
-- Name: members members_mother_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_mother_id_fkey FOREIGN KEY (mother_id) REFERENCES public.members(id);


-- Completed on 2026-06-06 13:27:33 +07

--
-- PostgreSQL database dump complete
--

\unrestrict nDHIk2rwOFb6ffb7Cp7Mi6xpTo8F0MGqfDZC8s97QCByR3gXhvkaJuwDesqLTJ9

