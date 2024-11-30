import dotenv from 'dotenv'
// import fs from 'fs';

dotenv.config()

const token = process.env.TOKEN;


async function query(data) {
	const response = await fetch(
		"https://api-inference.huggingface.co/models/ZB-Tech/Text-to-Image",
		{
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify(data),
		}
	);
	const result = await response.blob();
	return result;
}
query({"inputs": "cat riding a bicycle on moon"}).then((response) => {
    // response.arrayBuffer().then((buffer) => {
    //     fs.writeFileSync('generated-image.png', Buffer.from(buffer));
    //     console.log("Image saved as 'generated-image.png'. Open it to view.");
    // });
    console.log(response);
});