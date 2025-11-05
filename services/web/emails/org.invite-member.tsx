import EmailButton from "./components/Button";
import Logo from "./components/Logo";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
interface EmailConfirmationProps {
  host: string | undefined;
  token: string;
  org_display_name: string;
}

export default function InviteMember({
  host,
  token,
  org_display_name,
}: EmailConfirmationProps) {
  const previewText = `You're invited to join ${org_display_name}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Section>
            <Text style={text}>Hey,</Text>
            <Text style={text}>
              You're invited to join <strong>{org_display_name}</strong> on
              Editframe.
            </Text>

            <Text style={text}>
              To accept the invitation and join the team, click the button
              below:
            </Text>
            <EmailButton
              href={`${host}/invitation/${token}`}
              label="View invitation"
            />
            <Text style={text}>
              If you didn't request this, just ignore and delete this message.
              or contact us at{" "}
              <a href="mailto:team@editframe.com">team@editframe.com</a>
            </Text>
          </Section>
          <Text style={text}>Thanks,</Text>
          <Text style={text}>The Editframe team</Text>
        </Container>
      </Body>
    </Html>
  );
}

InviteMember.PreviewProps = {
  host: "",
  org_display_name: "",
  token: "122",
} satisfies EmailConfirmationProps;

const main = {
  backgroundColor: "#f6f9fc",
  padding: "10px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  padding: "45px",
};

const text = {
  fontSize: "16px",
  fontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  fontWeight: "300",
  color: "#404040",
  lineHeight: "26px",
};
