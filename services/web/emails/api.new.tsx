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
  orgName: string;
  keyName: string;
  emailAddress: string;
}

export default function NewApiEmail({
  keyName,
  orgName,
  emailAddress,
}: EmailConfirmationProps) {
  const previewText = `A new API key has been created for your organization: ${orgName}`;
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
              A new API key has been added to your organization:{" "}
              <strong>{orgName}</strong>
            </Text>

            <Text style={text}>
              <strong>Key name:</strong> {keyName}
            </Text>
            <Text style={text}>
              <strong>API creator email:</strong> {emailAddress}
            </Text>
            <Text style={text}>
             If you have any questions, please contact us
              at <a href="mailto:team@editframe.com">team@editframe.com</a>
            </Text>
          </Section>
          <Text style={text}>Thanks,</Text>
          <Text style={text}>The Editframe team</Text>
        </Container>
      </Body>
    </Html>
  );
}

NewApiEmail.PreviewProps = {
  orgName: "",
  keyName: "",
  emailAddress: "",
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
