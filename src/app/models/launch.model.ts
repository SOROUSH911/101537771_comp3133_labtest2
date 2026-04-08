export interface Launch {
  id: string;
  name: string;
  flight_number: number;
  date_utc: string;
  date_local: string;
  success: boolean | null;
  details: string | null;
  upcoming: boolean;
  rocket: string;
  crew: string[];
  links: {
    patch: {
      small: string | null;
      large: string | null;
    };
    flickr: {
      small: string[];
      original: string[];
    };
    webcast: string | null;
    youtube_id: string | null;
    article: string | null;
    wikipedia: string | null;
  };
  cores: {
    core: string | null;
    flight: number | null;
    gridfins: boolean | null;
    legs: boolean | null;
    reused: boolean | null;
    landing_success: boolean | null;
    landing_type: string | null;
  }[];
  failures: {
    time: number;
    altitude: number | null;
    reason: string;
  }[];
}
