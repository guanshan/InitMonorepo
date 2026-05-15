-- Backfill empty usernames so the unique index can be created safely.
-- Earlier rows defaulted to '' which would cause the index creation to fail
-- the moment two such rows existed.
UPDATE `user` SET `username` = CONCAT('user_', `id`) WHERE `username` = '';

-- Drop the empty-string default. The application always derives a username
-- on insert (see UsersService.deriveUsername); leaving '' as the default
-- alongside the new unique index would let two unconditional inserts collide.
ALTER TABLE `user` MODIFY `username` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_username_key` ON `user`(`username`);
