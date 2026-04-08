export interface Mission {
  flight_number: number;
  mission_name: string;
  launch_year: string;
  details: string | null;
  launch_success: boolean | null;
  upcoming: boolean;
  rocket: {
    rocket_name: string;
    rocket_type: string;
  };
  links: {
    mission_patch_small: string | null;
    mission_patch: string | null;
    article_link: string | null;
    wikipedia: string | null;
    video_link: string | null;
  };
  launch_site?: {
    site_name_long: string;
  };
}
