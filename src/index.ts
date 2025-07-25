/**
 * Worker de apoyo para cms de ideal.fiuni.edu.py
 * Crea una branch, un commit y luego genera la pull request
 * Para mantener el proceso de control manual en el contenido de la plataforma
 */
import { Octokit, App } from "octokit";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== "POST") {
			return new Response(`Metodo no Admitido`, { status: 405 });
		}
		try {
			// Manejamos el caso de suba de archivos

			const privateKey = atob(env.PRIVATE_KEY_BASE64);

			// instancia de una APP para poder acceder a los permisos de nuestra github app
			const app = new App({
				appId: env.APP_ID,
				privateKey: privateKey
			});
			// Creamos una instancia autenticada de la app para con la instalación de la github app que vamos a usar
			const octokit = await app.getInstallationOctokit(env.INSTALLATION_ID);

			// empezamos a trabajar con los datos que llegan 
			const contentType = request.headers.get("content-type");

			let fileName: string;
			let content: string;

			if (contentType?.includes("multipart/form-data")) {
				// Manejo de archivos subidos via FormData
				const formData = await request.formData();
				const file = formData.get("file") as File;

				if (!file) {
					return new Response("No se encontró archivo", { status: 400 });
				}

				fileName = file.name;
				const arrayBuffer = await file.arrayBuffer();
				const uint8Array = new Uint8Array(arrayBuffer);
				function uint8ToBase64(bytes: Uint8Array): string {
					let binary = '';
					for (let i = 0; i < bytes.length; i++) {
						binary += String.fromCharCode(bytes[i]);
					}
					return btoa(binary);
				}
				content = uint8ToBase64(uint8Array);
			}

			// proceso de creación de pr
			// 1. Obtener el último commit de 'master'
			const { data: { commit: { sha: baseSha } } } = await octokit.rest.repos.getBranch({
				owner: env.GITHUB_OWNER,
				repo: env.GITHUB_REPO,
				branch: "master",
			});

			// 2. Crear un nuevo Branch (basado en main)
			const branchName = `editor-${fileName}`;
			await octokit.rest.git.createRef({
				owner: env.GITHUB_OWNER,
				repo: env.GITHUB_REPO,
				ref: `refs/heads/${branchName}`,
				sha: baseSha,
			});
			// 3. Subir el archivo a /src/content/posts/

			await octokit.rest.repos.createOrUpdateFileContents({
				owner: env.GITHUB_OWNER,
				repo: env.GITHUB_REPO,
				path: `src/content/posts/${fileName}`,
				message: `Nuevo post desde worker: ${fileName}`,
				content: content,
				branch: branchName,
			});

			// 4. Crear un Pull Request
			const { data: pr } = await octokit.rest.pulls.create({
				owner: env.GITHUB_OWNER,
				repo: env.GITHUB_REPO,
				title: `Nuevo post: ${fileName}`,
				head: branchName,
				base: "master",
				body: "Creado automáticamente desde el editor.",
			});

			return new Response(
				JSON.stringify({
					success: true,
					// prUrl: pr.html_url,
					branch: branchName,
				}),
				{ headers: { "Content-Type": "application/json" } }
			);



			// return new Response(
			// 	JSON.stringify({
			// 		success: true,
			// 		message: "GitHub connection successful",
			// 		data: {
			// 			total_count: repos.data.total_count,
			// 			repositories: repos.data.repositories.map(repo => ({
			// 				name: repo.name,
			// 				full_name: repo.full_name,
			// 				private: repo.private
			// 			}))
			// 		}
			// 	}),
			// 	{ status: 200, headers: { "Content-Type": "application/json" } }
			// );

		} catch (error) {
			return new Response(
				JSON.stringify({
					success: false,
					error: error.message,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			)
		}
	},
} satisfies ExportedHandler<Env>;