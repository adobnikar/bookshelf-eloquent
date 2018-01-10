'use strict';

const User = require('./models/user');
const Group = require('./models/group');

async function asyncWrapper() {
	// Create a new user if it does not exist.
	let user = await User.select('id').where('username', 'user').first();
	if (user == null) {
		user = new User({
			firstName: 'dgfdgfdggf',
			lastName: 'adsaddfdsf',
			allowUseOfMyContactInformation: false,
			username: 'user',
			email: 'sadsad@gmail.com',
			password: 'asdsadssad',
		});
		await user.save();
	}

	// Create a new group if it does not exist.
	let group = await Group.select('id').where('name', 'group').first();
	if (group == null) {
		group = new Group({
			name: 'group',
			description: 'adsaddfdsf',
			isPublic: false,
			ownerId: user.get('id'),
		});
		await group.save();
	}

  // Select data to print it out.
  let allUsers = await User.with('groups').get();
  allUsers = allUsers.toJSON();
  console.log(JSON.stringify(allUsers, null, 4));
}

asyncWrapper().then((error) => {
	console.log('Done.');
	process.exit(0);
}).catch((error) => {
	console.error(error.message);
	console.error(error.stack);
	console.error('Exit.');
	process.exit(1);
});
