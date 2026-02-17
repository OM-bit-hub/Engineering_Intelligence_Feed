// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

class BuilderService {
    async getBuilders() {
        try {
            // In a real scenario, fetch from DB
            // const builders = await prisma.builder.findMany({
            //   where: { is_active: true }
            // });

            // For POC/MockUp, return mock data
            return [
                { id: "1", name: "Guillermo Rauch", platform: "twitter", profile_url: "https://twitter.com/rauchg" },
                { id: "2", name: "Gergely Orosz", platform: "blog", profile_url: "https://blog.pragmaticengineer.com" },
                { id: "3", name: "Addy Osmani", platform: "linkedin", profile_url: "https://linkedin.com/in/addyosmani" },
                { id: "4", name: "Kent C. Dodds", platform: "twitter", profile_url: "https://twitter.com/kentcdodds" },
                { id: "5", name: "Charity Majors", platform: "blog", profile_url: "https://charity.wtf" }
            ];
        } catch (error) {
            console.error("Error fetching builders:", error);
            return [];
        }
    }

    async addBuilder(builderData) {
        console.log("Mock add builder:", builderData);
        return { id: "mock-id", ...builderData };
    }
}

module.exports = new BuilderService();
