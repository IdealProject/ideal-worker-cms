
/**
 * Worker de apoyo para cms de ideal.fiuni.edu.py
 * Crea una branch, un commit y luego genera la pull request
 * Para mantener el proceso de control manual en el contenido de la plataforma
 */
import { Octokit } from "octokit";
export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World! Chris!');
	},
} satisfies ExportedHandler<Env>;
