import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export function IssueDetailsBottomPreview() {
  return (
    <Box sx={{ mt: 0 }}>
      <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" width="100%" height={88} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" width="100%" height={88} />
    </Box>
  );
}
