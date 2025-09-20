import {
  NavLink,
  Avatar,
  NavLinkProps,
  Group,
  Stack,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconBook, IconLogout, IconTemplate } from "@tabler/icons-react";
import { useNavigate, LinkComponent, createLink } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { forwardRef } from "react";
import { CustomAnchor } from "./buttons/link-button.tsx";
import {
  showErrorNotification,
  showSuccessNotification,
} from "components/notifications.ts";
import { supabase } from "lib/supabase.ts";
import { useAccessToken } from "hooks/auth.ts";

type MantineNavLinkProps = Omit<NavLinkProps, "href">;

const MantineLinkComponent = forwardRef<HTMLAnchorElement, MantineNavLinkProps>(
  (props, ref) => {
    return <NavLink ref={ref} {...props} />;
  },
);

const CreatedLinkComponent = createLink(MantineLinkComponent);

export const CustomLink: LinkComponent<typeof MantineLinkComponent> = (
  props,
) => {
  return <CreatedLinkComponent preload="intent" {...props} />;
};

export function Navbar() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useAccessToken();

  // Memoize UUID generation to avoid creating new links on each render

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showErrorNotification({
        message: error.message,
      });
    } else {
      showSuccessNotification({
        message: "Successfully logged out!",
      });
      queryClient.invalidateQueries({
        queryKey: ["accessToken"],
      });
    }
    navigate({ to: "/login" });
  };

  return (
    <div className="flex h-full max-h-screen flex-col gap-6 p-4 items-center">
      <div className="flex flex-1 flex-col justify-between gap-6 items-center w-full">
        <section className="flex flex-col gap-4 items-center">
          <CustomAnchor to="/admin/template-problems">
            <Tooltip label="Template Problems" position="right" withArrow>
              <ActionIcon variant="subtle" c="black" size="xl">
                <IconTemplate size={32} />
              </ActionIcon>
            </Tooltip>
          </CustomAnchor>
          <CustomAnchor to="/admin/problems">
            <Tooltip label="My Problems" position="right" withArrow>
              <ActionIcon variant="subtle" c="black" size="xl">
                <IconBook size={32} />
              </ActionIcon>
            </Tooltip>
          </CustomAnchor>
        </section>
        <Stack align="center" gap="md">
          <Group justify="center">
            <Tooltip label={data.payload.email} position="right" withArrow>
              <Avatar color="initials" name={data.payload.email} size="lg" />
            </Tooltip>
          </Group>
          <Tooltip label="Logout" position="right" withArrow>
            <ActionIcon onClick={logout} variant="light" color="red" size="xl">
              <IconLogout size={32} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      </div>
    </div>
  );
}
