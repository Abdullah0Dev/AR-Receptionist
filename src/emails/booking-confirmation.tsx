import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
  Hr,
} from "react-email";

export type BookingConfirmationEmailProps = {
  customer: string;
  service: string;
  deadline: string;
  branch: string;
  notes?: string;
};

const BookingConfirmationEmail = ({
  customer,
  service,
  deadline,
  branch,
  notes,
}: BookingConfirmationEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        ✅ We've got your booking, {customer} — {service} at {branch}
      </Preview>
      <Tailwind>
        <Body className="bg-transparent font-montserrat py-[40px]">
          <Container className="bg-white border-2 border-[#4f46e5] rounded-[16px] max-w-[600px] mx-auto overflow-hidden">
            {/* ── Header ── */}
            <Section className="bg-[#4f46e5] px-[40px] py-[32px]">
              <Heading className="text-[13px] font-bold tracking-[0.18em] uppercase text-white/70 m-0 mb-[6px]">
                Gold Star Dry Cleaners
              </Heading>
              <Heading className="text-[28px] font-black text-white m-0 leading-tight">
                Booking Received
              </Heading>
              <Text className="text-[14px] text-white/80 m-0 mt-[6px]">
                Thanks {customer} — we've got everything we need.
              </Text>
            </Section>

            {/* ── Body ── */}
            <Section className="px-[40px] py-[32px]">
              <Text className="text-[15px] text-[#333] leading-[24px] m-0 mb-[24px]">
                Hi <strong>{customer}</strong>, your request has been received
                and our team will be in touch shortly to confirm your
                collection.
              </Text>

              <Heading className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#888] m-0 mb-[16px]">
                Your Booking Summary
              </Heading>

              {[
                { label: "Service", value: service },
                { label: "Ready By", value: deadline },
                { label: "Branch", value: branch },
              ].map(({ label, value }) => (
                <Row key={label} className="mb-[12px]">
                  <Column className="w-[140px]">
                    <Text className="text-[12px] font-bold uppercase tracking-wide text-[#888] m-0">
                      {label}
                    </Text>
                  </Column>
                  <Column>
                    <Text className="text-[15px] font-semibold text-[#111] m-0">
                      {value}
                    </Text>
                  </Column>
                </Row>
              ))}

              {/* Notes */}
              {notes && (
                <>
                  <Hr className="border-[#e5e7eb] my-[24px]" />
                  <Heading className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#888] m-0 mb-[10px]">
                    Notes
                  </Heading>
                  <Section className="bg-[#f5f5f5] rounded-[10px] px-[20px] py-[16px]">
                    <Text className="text-[14px] text-[#333] leading-[22px] m-0">
                      {notes}
                    </Text>
                  </Section>
                </>
              )}

              <Hr className="border-[#e5e7eb] my-[28px]" />

              {/* Reassurance block */}
              <Section className="bg-[#eef2ff] rounded-[10px] px-[20px] py-[16px]">
                <Text className="text-[13px] font-bold text-[#4f46e5] m-0 mb-[4px]">
                  📞 What happens next?
                </Text>
                <Text className="text-[13px] text-[#555] m-0 leading-[20px]">
                  A member of the <strong>{branch}</strong> team will call you
                  to confirm collection details. If you need to make any
                  changes, feel free to call us directly.
                </Text>
              </Section>
            </Section>

            {/* ── Footer ── */}
            <Section className="bg-[#f5f5f5] px-[40px] py-[20px]">
              <Text className="text-[11px] text-[#999] text-center m-0">
                © {new Date().getFullYear()} Gold Star Dry Cleaners · Powered
                by Autoreception.AI
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default BookingConfirmationEmail;