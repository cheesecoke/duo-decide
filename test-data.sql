-- Test data for Duo Decide app
-- This script adds sample couples, decisions, options, and votes for testing

-- First, let's create a test couple (using your real user ID and a test partner)
-- Replace 'test-partner-1' with your actual partner's user ID if you have one
INSERT INTO couples (id, user1_id, user2_id, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', '22222222-2222-2222-2222-222222222222', NOW(), NOW());

-- Create some test decisions
INSERT INTO decisions (id, title, description, deadline, creator_id, partner_id, couple_id, type, status, created_at, updated_at) VALUES
-- Vote decision (pending)
('33333333-3333-3333-3333-333333333333', 'Where should we go for dinner?', 'We need to decide on a restaurant for our anniversary dinner this weekend.', '2024-02-15', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'vote', 'pending', NOW(), NOW()),

-- Vote decision (one partner voted)
('44444444-4444-4444-4444-444444444444', 'What movie should we watch?', 'Looking for something romantic for movie night.', '2024-02-20', '22222222-2222-2222-2222-222222222222', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', '11111111-1111-1111-1111-111111111111', 'vote', 'voted', NOW(), NOW()),

-- Poll decision (pending)
('55555555-5555-5555-5555-555555555555', 'Where should we go on vacation?', 'Planning our summer trip - need to narrow down the options.', '2024-06-01', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'poll', 'pending', NOW(), NOW()),

-- Completed decision
('66666666-6666-6666-6666-666666666666', 'What color should we paint the bedroom?', 'Time to redecorate - need to choose a color scheme.', '2024-01-30', '22222222-2222-2222-2222-222222222222', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', '11111111-1111-1111-1111-111111111111', 'vote', 'completed', NOW(), NOW());

-- Create options for the decisions
INSERT INTO decision_options (id, decision_id, title, votes, eliminated_in_round, created_at) VALUES
-- Options for dinner decision
('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Italian Restaurant', 0, NULL, NOW()),
('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Sushi Place', 0, NULL, NOW()),
('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'Steakhouse', 0, NULL, NOW()),

-- Options for movie decision
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Romantic Comedy', 0, NULL, NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Drama', 0, NULL, NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'Action Movie', 0, NULL, NOW()),

-- Options for vacation decision
('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'Beach Resort', 0, NULL, NOW()),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 'Mountain Cabin', 0, NULL, NOW()),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555', 'City Break', 0, NULL, NOW()),
('10101010-1010-1010-1010-101010101010', '55555555-5555-5555-5555-555555555555', 'Road Trip', 0, NULL, NOW()),

-- Options for bedroom color decision
('20202020-2020-2020-2020-202020202020', '66666666-6666-6666-6666-666666666666', 'Light Blue', 0, NULL, NOW()),
('30303030-3030-3030-3030-303030303030', '66666666-6666-6666-6666-666666666666', 'Warm Gray', 0, NULL, NOW()),
('40404040-4040-4040-4040-404040404040', '66666666-6666-6666-6666-666666666666', 'Soft Green', 0, NULL, NOW());

-- Add some votes for testing
INSERT INTO votes (id, decision_id, user_id, option_id, round, created_at) VALUES
-- Partner voted for movie (drama)
('50505050-5050-5050-5050-505050505050', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, NOW()),

-- Partner voted for bedroom color (light blue)
('60606060-6060-6060-6060-606060606060', '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '20202020-2020-2020-2020-202020202020', 1, NOW()),
-- You voted for bedroom color (warm gray) - this decision is completed
('70707070-7070-7070-7070-707070707070', '66666666-6666-6666-6666-666666666666', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', '30303030-3030-3030-3030-303030303030', 1, NOW());

-- Update the completed decision with final result
UPDATE decisions 
SET decided_by = 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', 
    decided_at = NOW(), 
    final_decision = '30303030-3030-3030-3030-303030303030'
WHERE id = '66666666-6666-6666-6666-666666666666';
