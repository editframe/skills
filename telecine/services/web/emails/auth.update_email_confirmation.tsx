import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import EmailButton from "./components/Button";
import Logo from "./components/Logo";
interface EmailConfirmationProps {
  token: string;
  host: string;
}

export default function UpdateEmailConfirmation({
  token,
  host,
}: EmailConfirmationProps) {
  const previewText = "Confirm your updated email address";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Section>
            <Text style={text}>Hi,</Text>
            <Text style={text}>
              Someone update the email address associated with your Editframe
              account. Please confirm your email address by clicking
            </Text>
            <EmailButton
              href={`${host}/auth/confirm_email/${token}`}
              label="Confirm your new email address"
            />
            <Text style={text}>
              If you didn&apos;t request this change, please contact us
              immediately at
            </Text>
            <Text style={text}>Thanks,</Text>
            <Text style={text}>The Editframe team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

UpdateEmailConfirmation.PreviewProps = {
  token: "",
  host: "",
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
