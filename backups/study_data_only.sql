--
-- PostgreSQL database dump
--

\restrict aYnqgXH5m69vWSauLQUeTJKLhdmCxvNf42uNHEBlYCmkEjZq7Mfn6jCT6bmTTZH

-- Dumped from database version 14.19
-- Dumped by pg_dump version 14.19

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

--
-- Data for Name: study_sessions; Type: TABLE DATA; Schema: public; Owner: per_user
--



--
-- Data for Name: study_tests; Type: TABLE DATA; Schema: public; Owner: per_user
--

INSERT INTO public.study_tests VALUES ('6be5984e-c6b2-47d1-9718-fded007078bc', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'in_progress', '2025-10-01 11:54:12.635829', NULL, 0, NULL, NULL, '2025-10-01 11:54:12.635829', '2025-10-01 11:54:12.635829');
INSERT INTO public.study_tests VALUES ('4e3eb6d9-c25b-4c97-b187-d4080220afc8', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'in_progress', '2025-10-01 11:54:32.38752', NULL, 0, NULL, NULL, '2025-10-01 11:54:32.38752', '2025-10-01 11:54:32.38752');
INSERT INTO public.study_tests VALUES ('9d1513cc-2cda-4aa7-b631-bc1f138c65d3', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'in_progress', '2025-10-01 11:56:54.019731', NULL, 0, NULL, NULL, '2025-10-01 11:56:54.019731', '2025-10-01 11:56:54.019731');
INSERT INTO public.study_tests VALUES ('b6d4f406-f8a3-453a-ba53-b25a79270c73', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'in_progress', '2025-10-01 13:13:08.000826', NULL, 0, NULL, NULL, '2025-10-01 13:13:08.000826', '2025-10-01 13:13:08.000826');
INSERT INTO public.study_tests VALUES ('366cc90b-0de7-4f79-b5ed-e8b0076c6151', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'in_progress', '2025-10-01 13:15:28.896536', NULL, 0, NULL, NULL, '2025-10-01 13:15:28.896536', '2025-10-01 13:15:28.896536');
INSERT INTO public.study_tests VALUES ('6791f154-6f4f-4d70-a26e-444688cc88df', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'completed', '2025-10-01 13:15:54.877578', '2025-10-01 13:18:05.82294', 0, 0.00, 2, '2025-10-01 13:15:54.877578', '2025-10-01 13:18:05.82294');
INSERT INTO public.study_tests VALUES ('98d75803-78d2-4c62-83f6-331adb489a18', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'completed', '2025-10-01 13:18:42.464465', '2025-10-01 13:20:54.939474', 0, 0.00, 2, '2025-10-01 13:18:42.464465', '2025-10-01 13:20:54.939474');
INSERT INTO public.study_tests VALUES ('5454e81a-5eb7-4ab8-aa0a-b25cf4805208', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'completed', '2025-10-01 13:24:50.587783', '2025-10-01 13:27:15.375977', 3, 75.00, 2, '2025-10-01 13:24:50.587783', '2025-10-01 13:27:15.375977');
INSERT INTO public.study_tests VALUES ('970879b3-2408-49a3-986d-fd79c648be91', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'in_progress', '2025-10-01 13:34:27.929715', NULL, 0, NULL, NULL, '2025-10-01 13:34:27.929715', '2025-10-01 13:34:27.929715');
INSERT INTO public.study_tests VALUES ('68099ad3-2ce2-46f8-9e84-e57aa8ceae9a', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'random', 4, 'completed', '2025-10-01 13:38:35.736461', '2025-10-01 13:40:25.913611', 2, 50.00, 1, '2025-10-01 13:38:35.736461', '2025-10-01 13:40:25.913611');
INSERT INTO public.study_tests VALUES ('5d0cd384-ecbe-4922-86f6-f7f594d05ab0', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'new', 4, 'completed', '2025-10-01 13:55:21.135784', '2025-10-01 13:58:13.29035', 3, 75.00, 2, '2025-10-01 13:55:21.135784', '2025-10-01 13:58:13.29035');
INSERT INTO public.study_tests VALUES ('a7f15fd7-5846-4f2a-b328-1fa78dd4763f', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'failed', 4, 'in_progress', '2025-10-01 14:32:51.888228', NULL, 0, NULL, NULL, '2025-10-01 14:32:51.888228', '2025-10-01 14:32:51.888228');
INSERT INTO public.study_tests VALUES ('41d5538a-5940-4384-9c88-80d131894e24', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'failed', 4, 'in_progress', '2025-10-01 14:45:58.563912', NULL, 0, NULL, NULL, '2025-10-01 14:45:58.563912', '2025-10-01 14:45:58.563912');
INSERT INTO public.study_tests VALUES ('3cc26102-0411-4b89-b80f-4087b21934fa', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1]', 'failed', 4, 'in_progress', '2025-10-01 14:45:58.564031', NULL, 0, NULL, NULL, '2025-10-01 14:45:58.564031', '2025-10-01 14:45:58.564031');
INSERT INTO public.study_tests VALUES ('ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1, 10]', 'random', 9, 'in_progress', '2025-10-01 14:49:07.225605', NULL, 0, NULL, NULL, '2025-10-01 14:49:07.225605', '2025-10-01 14:49:07.225605');
INSERT INTO public.study_tests VALUES ('201e3b68-b521-4337-9b3d-230c3740d078', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1, 10]', 'random', 9, 'in_progress', '2025-10-01 14:49:07.225276', NULL, 0, NULL, NULL, '2025-10-01 14:49:07.225276', '2025-10-01 14:49:07.225276');
INSERT INTO public.study_tests VALUES ('c2971d07-c57f-40b5-9b0a-d6608647d0fd', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[10]', 'new', 5, 'in_progress', '2025-10-01 14:51:49.92824', NULL, 0, NULL, NULL, '2025-10-01 14:51:49.92824', '2025-10-01 14:51:49.92824');
INSERT INTO public.study_tests VALUES ('f2273d70-1f61-4952-9833-ae3888365583', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[10]', 'new', 5, 'in_progress', '2025-10-01 14:51:49.92814', NULL, 0, NULL, NULL, '2025-10-01 14:51:49.92814', '2025-10-01 14:51:49.92814');
INSERT INTO public.study_tests VALUES ('b59e67f6-7628-4b88-870b-c553439d18fb', 'f717dd33-5189-47d3-b803-2456bbd150a8', '[1, 2]', 'random', 6, 'completed', '2025-10-01 21:13:46.361352', '2025-10-01 21:15:27.252619', 1, 16.67, 1, '2025-10-01 21:13:46.361352', '2025-10-01 21:15:27.252619');


--
-- Data for Name: study_test_questions; Type: TABLE DATA; Schema: public; Owner: per_user
--

INSERT INTO public.study_test_questions VALUES ('b6ec4df6-24cf-435b-8f8d-64f9cae08438', '6be5984e-c6b2-47d1-9718-fded007078bc', '911ab958-c83e-4772-9fd5-40b9f40cc4a3', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:12.635829');
INSERT INTO public.study_test_questions VALUES ('ce85e007-5d3e-460e-8be1-59bfbbfde1fe', '6be5984e-c6b2-47d1-9718-fded007078bc', 'b413e99f-17c3-4308-a8a0-f7b258c2bbb1', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:12.635829');
INSERT INTO public.study_test_questions VALUES ('3eb04f18-6920-4724-b9d1-e8ba186ce185', '6be5984e-c6b2-47d1-9718-fded007078bc', '5fa73803-f06a-4994-9038-a8a0efb86071', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:12.635829');
INSERT INTO public.study_test_questions VALUES ('08430210-9b13-4272-8a31-4043e12871e0', '6be5984e-c6b2-47d1-9718-fded007078bc', '518f2395-3fa0-435c-a874-ff9238fea02d', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:12.635829');
INSERT INTO public.study_test_questions VALUES ('e407d032-c90d-4b4d-b38c-383bc2866786', '4e3eb6d9-c25b-4c97-b187-d4080220afc8', '7d773dd0-6836-4749-af09-f5a079eb6c94', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:32.38752');
INSERT INTO public.study_test_questions VALUES ('62cf84a8-d0c5-4c9b-a873-9a1e04180b49', '4e3eb6d9-c25b-4c97-b187-d4080220afc8', 'de97cb43-1003-4ae9-8c98-776ce33cbfc0', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:32.38752');
INSERT INTO public.study_test_questions VALUES ('1a3d1306-82a8-4f78-85b6-0b867a1da92b', '4e3eb6d9-c25b-4c97-b187-d4080220afc8', '698680ae-2e74-460f-829b-f5383872d3ac', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:32.38752');
INSERT INTO public.study_test_questions VALUES ('cf33aafc-ee25-48ca-aa26-2b33d8e79bf0', '4e3eb6d9-c25b-4c97-b187-d4080220afc8', '2fdfb4d6-e436-4e83-956f-37968dad1603', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:54:32.38752');
INSERT INTO public.study_test_questions VALUES ('20e5c340-054a-4d94-9f90-94217f915615', '9d1513cc-2cda-4aa7-b631-bc1f138c65d3', '373e951f-0b7e-45a6-93ca-d4cb9914d862', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:56:54.019731');
INSERT INTO public.study_test_questions VALUES ('f96cf11d-c6a6-4567-820f-20fb6d34cd56', '9d1513cc-2cda-4aa7-b631-bc1f138c65d3', '1b5db587-f7bb-4a32-b18d-44ab1aa6df2a', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:56:54.019731');
INSERT INTO public.study_test_questions VALUES ('ae5f699f-e0f6-49c8-9790-628955ffb42f', '9d1513cc-2cda-4aa7-b631-bc1f138c65d3', '26bdecea-fb63-4762-9e52-c69a75790185', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:56:54.019731');
INSERT INTO public.study_test_questions VALUES ('cf92d92d-694e-4c7f-8559-2c8c0ade898c', '9d1513cc-2cda-4aa7-b631-bc1f138c65d3', '5fa73803-f06a-4994-9038-a8a0efb86071', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 11:56:54.019731');
INSERT INTO public.study_test_questions VALUES ('d9faa7e3-633a-4b7a-8ae9-a9ac11fc4a1e', 'b6d4f406-f8a3-453a-ba53-b25a79270c73', '444eaa82-6923-4ef9-b7ac-458d3a1443fe', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:13:08.000826');
INSERT INTO public.study_test_questions VALUES ('eb2c519c-0626-42a9-a618-fb5368fd7a8c', 'b6d4f406-f8a3-453a-ba53-b25a79270c73', 'f2b2bb82-a8db-49c1-834e-a2be626d6614', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:13:08.000826');
INSERT INTO public.study_test_questions VALUES ('dd718bd9-ec59-4233-ad63-0f386845b17f', 'b6d4f406-f8a3-453a-ba53-b25a79270c73', '518f2395-3fa0-435c-a874-ff9238fea02d', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:13:08.000826');
INSERT INTO public.study_test_questions VALUES ('65dc0dcb-4573-4027-82a9-c1f10a4b18cb', 'b6d4f406-f8a3-453a-ba53-b25a79270c73', '22c4b00b-ccde-4160-a27b-ecaa5834cd39', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:13:08.000826');
INSERT INTO public.study_test_questions VALUES ('31e81d8d-81fa-4ec2-a081-763eb4c6c12d', '366cc90b-0de7-4f79-b5ed-e8b0076c6151', '7cd483da-aa18-4d16-bff8-67db03f3c607', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:28.896536');
INSERT INTO public.study_test_questions VALUES ('9e38afca-e2be-4d98-b027-7265640f2578', '366cc90b-0de7-4f79-b5ed-e8b0076c6151', '2f1fbb62-25c2-4bf4-8345-bbe0608b85ff', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:28.896536');
INSERT INTO public.study_test_questions VALUES ('3391fc8f-2e68-48d8-a5da-6b374fc20298', '366cc90b-0de7-4f79-b5ed-e8b0076c6151', '905fdfad-ed5c-4fa7-9a78-4d915217b019', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:28.896536');
INSERT INTO public.study_test_questions VALUES ('f0d5e358-e10d-4d9d-b80b-700faa021323', '366cc90b-0de7-4f79-b5ed-e8b0076c6151', '7080e444-b24d-4d05-a841-16b2a1c700ac', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:28.896536');
INSERT INTO public.study_test_questions VALUES ('87d8ad7e-485e-40fd-8342-07d21f09afae', '6791f154-6f4f-4d70-a26e-444688cc88df', '246e1625-0ce9-4922-b9d9-b815bbf5b6ea', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:54.877578');
INSERT INTO public.study_test_questions VALUES ('99ce1d97-9450-472c-8017-f375d49ea056', '6791f154-6f4f-4d70-a26e-444688cc88df', '90e3da0b-afa2-451f-bfca-7ff9fdfe8337', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:54.877578');
INSERT INTO public.study_test_questions VALUES ('094cbb02-16f2-4edd-8ccd-05998706ecb7', '6791f154-6f4f-4d70-a26e-444688cc88df', '81eb2ce2-d133-497f-8bad-a313af6802a6', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:54.877578');
INSERT INTO public.study_test_questions VALUES ('1ae94364-79ce-4dda-a986-f76dd74c0f56', '6791f154-6f4f-4d70-a26e-444688cc88df', 'd50b27e6-60b8-451f-9733-7e14864450db', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:15:54.877578');
INSERT INTO public.study_test_questions VALUES ('7bc330ab-67f2-49e4-bb42-f401a48b0102', '98d75803-78d2-4c62-83f6-331adb489a18', '671c9e6a-213e-45cb-8cb1-7cf1aa85a3f5', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:18:42.464465');
INSERT INTO public.study_test_questions VALUES ('6947786c-8153-44e1-8f5b-4946cfaf70e0', '98d75803-78d2-4c62-83f6-331adb489a18', '64736ca1-e5df-47b5-b6ef-41dba5cb0ca2', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:18:42.464465');
INSERT INTO public.study_test_questions VALUES ('19028c17-b2ca-4071-a6ea-e2367dc6b07d', '98d75803-78d2-4c62-83f6-331adb489a18', '30f99931-9020-46a7-827e-d2edb03ed64d', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:18:42.464465');
INSERT INTO public.study_test_questions VALUES ('f46b0547-997f-4fd1-a864-6334a4bf97f3', '98d75803-78d2-4c62-83f6-331adb489a18', '99a6fcfb-bf9c-48e0-b7de-196e999833e6', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:18:42.464465');
INSERT INTO public.study_test_questions VALUES ('99f89687-0c52-4204-bab6-3c0e2907aaf6', '5454e81a-5eb7-4ab8-aa0a-b25cf4805208', '682e2f46-8b3b-413d-a1b3-46c58cec20a9', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:24:50.587783');
INSERT INTO public.study_test_questions VALUES ('4c83db18-0e98-418f-96fe-5daa95af779b', '5454e81a-5eb7-4ab8-aa0a-b25cf4805208', '7258a5a1-e23b-4c00-bae4-ec4ed910c18e', 1, 1, 'Nomenclatura náutica', 'a', true, '2025-10-01 13:25:58.961628', 0, '2025-10-01 13:24:50.587783');
INSERT INTO public.study_test_questions VALUES ('dc473ed6-a150-4611-871a-fcb9e56847eb', '5454e81a-5eb7-4ab8-aa0a-b25cf4805208', '88e11408-6e33-405a-9158-713ce495be83', 2, 1, 'Nomenclatura náutica', 'a', true, '2025-10-01 13:26:35.010747', 36, '2025-10-01 13:24:50.587783');
INSERT INTO public.study_test_questions VALUES ('8e8c36e3-325e-48d4-8ba4-90c04fb172fe', '5454e81a-5eb7-4ab8-aa0a-b25cf4805208', '2fdfb4d6-e436-4e83-956f-37968dad1603', 3, 1, 'Nomenclatura náutica', 'd', true, '2025-10-01 13:26:53.485077', 18, '2025-10-01 13:24:50.587783');
INSERT INTO public.study_test_questions VALUES ('6786d174-f57a-4988-9b3b-8051f6527089', '970879b3-2408-49a3-986d-fd79c648be91', 'bd358518-3633-42a7-80eb-bf0451228255', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:34:27.929715');
INSERT INTO public.study_test_questions VALUES ('2b6c60e6-88d1-4eb3-9359-a1a5f6507a6f', '970879b3-2408-49a3-986d-fd79c648be91', '9e574662-4275-4720-92b6-2ae038a299c4', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:34:27.929715');
INSERT INTO public.study_test_questions VALUES ('1a08b808-1658-490f-9f09-5081f7b2bf8f', '970879b3-2408-49a3-986d-fd79c648be91', '4ccfb329-b172-4132-8506-0d5ec3f8d6d0', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:34:27.929715');
INSERT INTO public.study_test_questions VALUES ('1c597974-0e01-4e52-860c-d1220e75273c', '970879b3-2408-49a3-986d-fd79c648be91', 'e1f75bbd-d41f-44e9-ab0f-1b8130d2fba3', 1, 1, 'Nomenclatura náutica', 'a', true, '2025-10-01 13:35:09.204788', 0, '2025-10-01 13:34:27.929715');
INSERT INTO public.study_test_questions VALUES ('65911214-9b26-4e1b-bd1b-7f257a0a1dc6', '68099ad3-2ce2-46f8-9e84-e57aa8ceae9a', '113c24a0-ab7e-466a-a913-d50003cdca07', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:38:35.736461');
INSERT INTO public.study_test_questions VALUES ('f97d1f14-561f-467b-aaf3-a773264748b4', '68099ad3-2ce2-46f8-9e84-e57aa8ceae9a', '4c222f1d-7f9d-4022-9a4e-3dc8fc75fd9c', 1, 1, 'Nomenclatura náutica', 'b', false, '2025-10-01 13:39:27.774556', 0, '2025-10-01 13:38:35.736461');
INSERT INTO public.study_test_questions VALUES ('f92f04c6-b751-48a9-a409-b092e0e4eb67', '68099ad3-2ce2-46f8-9e84-e57aa8ceae9a', '8df36fd4-bbed-4714-ac48-0d9bcb818732', 2, 1, 'Nomenclatura náutica', 'c', true, '2025-10-01 13:39:46.138248', 18, '2025-10-01 13:38:35.736461');
INSERT INTO public.study_test_questions VALUES ('0ced44f1-9296-4f2f-b418-72104457b252', '68099ad3-2ce2-46f8-9e84-e57aa8ceae9a', 'dbe01fe7-d78a-47fa-8577-ff15da5e1385', 3, 1, 'Nomenclatura náutica', 'a', true, '2025-10-01 13:39:59.112189', 12, '2025-10-01 13:38:35.736461');
INSERT INTO public.study_test_questions VALUES ('8eaae774-3dfc-4ca4-bd4c-77ba866f377d', '5d0cd384-ecbe-4922-86f6-f7f594d05ab0', '72c1638b-94ed-4e21-80a3-c597738b1e1e', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 13:55:21.135784');
INSERT INTO public.study_test_questions VALUES ('8c21bf58-35a4-4847-842f-309957d76ccb', '5d0cd384-ecbe-4922-86f6-f7f594d05ab0', '60e244a6-96e4-4d93-82cf-d081e206fef3', 1, 1, 'Nomenclatura náutica', 'c', true, '2025-10-01 13:55:44.469669', 0, '2025-10-01 13:55:21.135784');
INSERT INTO public.study_test_questions VALUES ('48375e99-75ef-4040-9576-f6779097c52d', '5d0cd384-ecbe-4922-86f6-f7f594d05ab0', '264ce316-2d8a-498e-9cd8-a88f6d8fe4b0', 2, 1, 'Nomenclatura náutica', 'd', true, '2025-10-01 13:56:14.420125', 29, '2025-10-01 13:55:21.135784');
INSERT INTO public.study_test_questions VALUES ('3d572152-bbee-4378-be7a-be37c418c10d', '5d0cd384-ecbe-4922-86f6-f7f594d05ab0', '7a55dbe9-b340-410b-a3a0-03d53f7ca459', 3, 1, 'Nomenclatura náutica', 'b', true, '2025-10-01 13:57:44.387129', 89, '2025-10-01 13:55:21.135784');
INSERT INTO public.study_test_questions VALUES ('858afd36-dae3-44fa-993e-49694094747a', 'a7f15fd7-5846-4f2a-b328-1fa78dd4763f', '625f2878-17f4-4621-8ada-c30f80bf8e24', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:32:51.888228');
INSERT INTO public.study_test_questions VALUES ('e58a2125-9636-41f0-8c55-b6203f330dc7', 'a7f15fd7-5846-4f2a-b328-1fa78dd4763f', '7c32ce30-f80d-4c23-ba77-833d5f5ab02c', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:32:51.888228');
INSERT INTO public.study_test_questions VALUES ('5a794048-0378-4f1a-b358-d052b145b4bd', 'a7f15fd7-5846-4f2a-b328-1fa78dd4763f', '182726b2-5f4e-45fc-987c-a7abe68be6b5', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:32:51.888228');
INSERT INTO public.study_test_questions VALUES ('e7e9e103-0d7c-475f-9fed-06d4e2ae2c0c', 'a7f15fd7-5846-4f2a-b328-1fa78dd4763f', '698680ae-2e74-460f-829b-f5383872d3ac', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:32:51.888228');
INSERT INTO public.study_test_questions VALUES ('0069bf5a-7be4-44f5-b48b-75209cf5d7d2', '41d5538a-5940-4384-9c88-80d131894e24', '625f2878-17f4-4621-8ada-c30f80bf8e24', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.563912');
INSERT INTO public.study_test_questions VALUES ('c3ce2e91-667c-411a-9c77-b5dbac5e0762', '3cc26102-0411-4b89-b80f-4087b21934fa', '95c29632-1c85-4457-9bcd-222499d5b4c7', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.564031');
INSERT INTO public.study_test_questions VALUES ('9bec177a-50e4-43cb-a9f0-0a0339052214', '41d5538a-5940-4384-9c88-80d131894e24', 'c67e1cf0-676d-4354-b2c9-12707142b1ad', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.563912');
INSERT INTO public.study_test_questions VALUES ('72a21b1f-8dd6-46e3-a398-7c1861c8abfe', '3cc26102-0411-4b89-b80f-4087b21934fa', '7c32ce30-f80d-4c23-ba77-833d5f5ab02c', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.564031');
INSERT INTO public.study_test_questions VALUES ('2c0544c1-39aa-48db-973b-876b1fee607e', '41d5538a-5940-4384-9c88-80d131894e24', '7c32ce30-f80d-4c23-ba77-833d5f5ab02c', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.563912');
INSERT INTO public.study_test_questions VALUES ('8932678e-ce6e-4be0-8c36-9600156bdc76', '3cc26102-0411-4b89-b80f-4087b21934fa', '250fdf3d-278d-40be-892c-ebceac8beec8', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.564031');
INSERT INTO public.study_test_questions VALUES ('517a036f-42e9-46f3-aaf0-4ec2b19bc08d', '41d5538a-5940-4384-9c88-80d131894e24', '698680ae-2e74-460f-829b-f5383872d3ac', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.563912');
INSERT INTO public.study_test_questions VALUES ('f6ee305d-98da-4149-9fc0-74c96b022f09', '3cc26102-0411-4b89-b80f-4087b21934fa', '4fc786b8-3159-4564-a60f-07c2368c8c0c', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:45:58.564031');
INSERT INTO public.study_test_questions VALUES ('b65eb9df-d696-4ca3-b90d-5b0918e38ffb', '201e3b68-b521-4337-9b3d-230c3740d078', '24fab1c7-1cd4-4457-a091-f0c1c8519965', 1, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('da239fe9-428a-4ce1-b624-9cca764172d7', '201e3b68-b521-4337-9b3d-230c3740d078', 'eb7d9493-bc40-4126-80fb-e9a0295d5729', 2, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('adccacf4-d53b-4953-9446-bf99ac65e2bd', '201e3b68-b521-4337-9b3d-230c3740d078', '9078ac30-6acd-4b4d-bd03-6b95a8077a09', 3, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('255bde2b-edc1-4918-b714-0d9743a1714e', '201e3b68-b521-4337-9b3d-230c3740d078', 'efdfd56a-c47a-4bb3-b1dd-9a034c589ea2', 4, 1, 'Nomenclatura náutica', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('cfab6cd7-f038-4a9f-82e0-266a4dfc1f4a', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', '0d5937d9-fc33-4824-8ddc-0dd8321f872d', 2, 1, 'Nomenclatura náutica', 'd', true, '2025-10-01 14:50:50.038713', 33, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('57782033-4122-45ac-a58e-6a34adc40bce', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', '791af559-cc6f-45f6-952b-9a7810c7b069', 4, 1, 'Nomenclatura náutica', 'd', true, '2025-10-01 14:51:25.651823', 13, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('ada00fd5-de36-420b-8194-23f37dd35610', '201e3b68-b521-4337-9b3d-230c3740d078', '99f19269-68fb-4ae1-b182-ff156a585329', 5, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('e5da2f53-4e86-499c-9cdd-ccd99e554928', '201e3b68-b521-4337-9b3d-230c3740d078', '70affcd3-d4f0-43c6-b69d-62740bc76d1b', 6, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('41637a7e-3599-4bad-9dba-f05c04478b9f', '201e3b68-b521-4337-9b3d-230c3740d078', '16bcd2c4-001c-461e-a664-23fd02f4b88b', 7, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('955603a2-2a5e-4fc5-aeea-8bdd9d3c2ba0', '201e3b68-b521-4337-9b3d-230c3740d078', '520d8c18-fc63-4a05-b30f-1d3674e9cc54', 8, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('710f5b8f-5eb7-47bd-97b9-399f34a8c5fd', '201e3b68-b521-4337-9b3d-230c3740d078', 'cc06599a-4757-438f-9d5f-7981e7d1f339', 9, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225276');
INSERT INTO public.study_test_questions VALUES ('d066aba9-ec90-4802-8236-61f933d8b1cb', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', '20d7b2fa-6bd3-4b7e-b529-2b3d85140808', 1, 1, 'Nomenclatura náutica', 'b', true, '2025-10-01 14:50:16.845137', 0, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('0330d82d-5c06-4280-9d80-2d4f24c87cc1', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', 'f0f391f5-de2f-4db9-a738-60a98682e9a6', 3, 1, 'Nomenclatura náutica', 'd', true, '2025-10-01 14:51:12.218775', 22, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('4ceb19d9-dcca-42bb-878c-43c4a352ca17', 'f2273d70-1f61-4952-9833-ae3888365583', 'c7cb74a4-482c-4e33-8abd-df8a6d812867', 1, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92814');
INSERT INTO public.study_test_questions VALUES ('f3bc3cc1-bdde-4435-9e91-15c7809cd727', 'f2273d70-1f61-4952-9833-ae3888365583', 'e7649c76-9d3b-4f05-9701-59dcb333cf2b', 2, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92814');
INSERT INTO public.study_test_questions VALUES ('922fdb83-b440-4a31-9df5-42d11b271ddc', 'f2273d70-1f61-4952-9833-ae3888365583', '7a237e84-bd6d-4f70-ad6e-c7b0ce54cd34', 3, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92814');
INSERT INTO public.study_test_questions VALUES ('118bc3ad-aff0-4ff8-8e2f-50d080315664', 'f2273d70-1f61-4952-9833-ae3888365583', '4d88206d-bbd5-4d3c-824a-4559968aeb33', 4, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92814');
INSERT INTO public.study_test_questions VALUES ('9546984b-25e2-4fe9-a998-bb5f1d4af204', 'f2273d70-1f61-4952-9833-ae3888365583', '0217afd3-83ca-4d05-8703-a49716d52e5d', 5, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92814');
INSERT INTO public.study_test_questions VALUES ('c26e9a97-cc40-4fae-bef5-52ef759ed395', 'c2971d07-c57f-40b5-9b0a-d6608647d0fd', 'bcec9e33-a405-4ccf-a885-f6e7cdf74f99', 1, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92824');
INSERT INTO public.study_test_questions VALUES ('c02691b5-e998-4ad7-99f7-8736e7b3b0f1', 'c2971d07-c57f-40b5-9b0a-d6608647d0fd', '4aa95877-bd6d-4107-986b-c4ee1883633c', 2, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92824');
INSERT INTO public.study_test_questions VALUES ('972e024e-5439-470a-944a-3781967bc0be', 'c2971d07-c57f-40b5-9b0a-d6608647d0fd', 'c18ac1fa-768b-4228-8dd9-46b97a399508', 3, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92824');
INSERT INTO public.study_test_questions VALUES ('6cd1c02d-8728-4cb9-b132-3a834428fad4', 'c2971d07-c57f-40b5-9b0a-d6608647d0fd', 'dbc558bf-ff3b-41a5-bc41-ab0966bf2444', 4, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92824');
INSERT INTO public.study_test_questions VALUES ('6bb7e069-35d7-4030-880b-a1ee436496b2', 'c2971d07-c57f-40b5-9b0a-d6608647d0fd', 'd733a4d0-3ddf-4e4d-a00f-77b258f87942', 5, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:51:49.92824');
INSERT INTO public.study_test_questions VALUES ('d9f577c1-09e9-4102-a890-108c35c8b0d6', 'b59e67f6-7628-4b88-870b-c553439d18fb', '8cbe25a6-4ef9-4691-a4c4-083933aa8872', 1, 1, 'Nomenclatura náutica', 'a', false, '2025-10-01 21:14:39.02437', 15, '2025-10-01 21:13:46.361352');
INSERT INTO public.study_test_questions VALUES ('5bf1474f-7beb-4576-b55e-d36ef52d5c7a', 'b59e67f6-7628-4b88-870b-c553439d18fb', 'b80a1ece-e063-4e4e-95f1-9732d45f94fa', 2, 1, 'Nomenclatura náutica', 'b', false, '2025-10-01 21:15:18.337855', 10, '2025-10-01 21:13:46.361352');
INSERT INTO public.study_test_questions VALUES ('227a5448-fae3-43b5-b021-2b805acf46d1', 'b59e67f6-7628-4b88-870b-c553439d18fb', 'ea6188d6-e036-4201-894c-83abf07eaf73', 3, 1, 'Nomenclatura náutica', 'b', false, '2025-10-01 21:15:18.373901', 10, '2025-10-01 21:13:46.361352');
INSERT INTO public.study_test_questions VALUES ('612b3fba-8955-41bf-91b4-97213041240f', 'b59e67f6-7628-4b88-870b-c553439d18fb', 'd50b27e6-60b8-451f-9733-7e14864450db', 4, 1, 'Nomenclatura náutica', 'b', true, '2025-10-01 21:15:18.406484', 10, '2025-10-01 21:13:46.361352');
INSERT INTO public.study_test_questions VALUES ('49fd180e-ad28-43db-9203-4bed8478311f', 'b59e67f6-7628-4b88-870b-c553439d18fb', '5f17659f-da8d-4325-9849-2d6d0410b2e9', 5, 2, 'Elementos de amarre y fondeo', 'b', false, '2025-10-01 21:15:18.438424', 10, '2025-10-01 21:13:46.361352');
INSERT INTO public.study_test_questions VALUES ('92cda498-ac23-46dc-8168-ede90822c3e9', 'b59e67f6-7628-4b88-870b-c553439d18fb', '2f1e1787-dd47-4bb1-a5f6-1cca7c42573f', 6, 2, 'Elementos de amarre y fondeo', 'b', false, '2025-10-01 21:15:18.47086', 10, '2025-10-01 21:13:46.361352');
INSERT INTO public.study_test_questions VALUES ('96c31953-8018-44d6-87e2-76d957579c4e', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', '2cfbc1fa-0b5e-425e-9f01-a51ac20a91d0', 5, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('db55b543-1a42-4b2a-b66e-4c3f9659106f', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', 'd9e1b3c5-97e3-40d2-b352-6bf09a45828c', 6, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('4cb33cd0-e998-4589-bbf5-ae5bee8860bb', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', '6d8d7250-102a-46f6-aa07-f289e5e58974', 7, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('246ae28d-62dd-4362-bd24-aa1756765cba', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', '97af23a3-46e1-4cc1-ad3b-6bb071e6c840', 8, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225605');
INSERT INTO public.study_test_questions VALUES ('0e1252e4-469c-459a-b24a-7aa836d76f38', 'ee69e7c0-ea13-4bb8-86d8-42abaf40b5b0', 'fb3d274a-6e1c-4acd-bdae-cb2b095b693c', 9, 10, 'Teoría de la navegación', NULL, NULL, NULL, NULL, '2025-10-01 14:49:07.225605');


--
-- Name: study_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: per_user
--

SELECT pg_catalog.setval('public.study_sessions_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict aYnqgXH5m69vWSauLQUeTJKLhdmCxvNf42uNHEBlYCmkEjZq7Mfn6jCT6bmTTZH

