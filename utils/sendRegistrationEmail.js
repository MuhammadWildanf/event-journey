import { sendEmail } from "./mailer.js";
import { registrationEmailTemplate } from "./emailTemplate.js";

export const sendRegistrationEmail = async (name, email) => {
    const tpl = registrationEmailTemplate(name);

    return sendEmail(
        email,
        tpl.subject,
        "",
        tpl.html
    );
};
