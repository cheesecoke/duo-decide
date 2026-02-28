-- Enable Realtime publication for all tables used in subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE option_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE option_list_items;

-- REPLICA IDENTITY FULL lets DELETE events include the old row (needed to get the ID)
ALTER TABLE decisions REPLICA IDENTITY FULL;
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER TABLE option_lists REPLICA IDENTITY FULL;
ALTER TABLE option_list_items REPLICA IDENTITY FULL;
