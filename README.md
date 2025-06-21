### Setup Instructions

1. **Configure Docker Credentials**  
   Add your Docker username and password as environment variables:  
   - `DOCKER_USERNAME`  
   - `DOCKER_PASSWORD`

2. **Update Build Configuration**  
   Modify the project name in the `build-and-deploy.yml` file to match your project.

3. **Set Up Environment Files**  
   - Create `.env.production` and `.env.development` files.  
   - Add your environment variables to these files.  
   - Encrypt the files using the following command:  
     ```bash
     dotenvx encrypt -r .env.production .env.development
     ```

4. **Build and Push to GitHub**  
   Build your project and push the changes to your GitHub repository.

5. **Deploy to Railway**  
   - Create a new Railway project and select "Docker Image" as the source.  
   - Copy the private key from `.env.keys` and add it as a secret in Railway's environment variables.